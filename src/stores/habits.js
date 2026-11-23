import { reactive, ref, watch } from 'vue'
import { useAuthStore } from './auth'
import { defineStore } from 'pinia'

export const useHabitsStore = defineStore('habits', () => {
  const auth = useAuthStore()
  const habits = ref([])
  const checks = ref([])
  const checksReady = ref(false)
  const habitLoadError = ref('')
  const checkLoadError = ref('')

  // تغییرات تأییدشده را تا دریافت فهرست تازه نگه می‌داریم.
  const confirmedChecks = reactive(new Map())
  let checksRequestId = 0
  let session = 0
  watch(() => auth.token, () => {
    session += 1
    habits.value = []
    checks.value = []
    confirmedChecks.clear()
    checksReady.value = false
    habitLoadError.value = ''
    checkLoadError.value = ''
  }, { flush: 'sync' })

  const habitsPath = '/habit/habits/'
  const checksPath = '/habit/checks/'

  async function request(path, failureMessage, { method = 'GET', data } = {}) {
    const requestSession = session
    const headers = { Authorization: `Token ${auth.token}` }
    if (data !== undefined) headers['Content-Type'] = 'application/json'

    const response = await fetch(path, {
      method,
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
    }).catch(() => null)

    if (!response) throw new Error('ارتباط با سرور برقرار نشد.')
    if (response.status === 401) {
      // پاسخ دیررس نشست قبلی نباید کاربر فعلی را خارج کند.
      const message = 'نشست شما پایان یافته است. دوباره وارد شوید.'
      if (requestSession === session) auth.clearSession(message)
      throw new Error(message)
    }
    if (!response.ok) throw new Error(failureMessage)

    return response
  }

  // فقط پاسخ آرایه‌ای را به‌عنوان فهرست معتبر می‌پذیریم.
  async function readList(path, failureMessage) {
    const response = await request(path, failureMessage)
    const data = await response.json().catch(() => null)

    if (!Array.isArray(data)) throw new Error('پاسخ سرور قابل خواندن نیست.')
    return data
  }

  // دریافت فهرست عادت‌ها و تازه‌سازی آن بعد از ساخت یا حذف

  async function loadHabits() {
    const currentSession = session
    habitLoadError.value = ''
    try {
      const records = await readList(habitsPath, 'دریافت فهرست عادت‌ها انجام نشد.')
      if (currentSession === session) habits.value = records
    } catch (error) {
      if (currentSession !== session) return
      habitLoadError.value = error.message
    }
  }

  // چک‌باکس‌ها پس از دریافت وضعیت تیک‌ها قابل تغییر می‌شوند.
  async function loadChecks({ afterSave = false } = {}) {
    const currentSession = session
    const requestId = ++checksRequestId
    checkLoadError.value = ''
    try {
      const records = await readList(checksPath, 'دریافت وضعیت تیک‌ها انجام نشد.')
      if (currentSession !== session || requestId !== checksRequestId) return
      checks.value = records
      confirmedChecks.clear()
      checksReady.value = true
    } catch (error) {
      if (currentSession !== session || requestId !== checksRequestId) return
      checksReady.value = false
      checkLoadError.value = afterSave
        ? 'تغییر تیک ذخیره شد، اما تازه‌سازی وضعیت تیک‌ها ناموفق بود.'
        : error.message
    }
  }

  async function createHabit(details) {
    const currentSession = session
    await request(habitsPath, 'ساخت عادت انجام نشد.', {
      method: 'POST',
      data: details,
    })
    if (currentSession === session) await loadHabits()
  }

  async function deleteHabit(id) {
    const currentSession = session
    await request(habitsPath + id, 'حذف عادت انجام نشد.', { method: 'DELETE' })
    if (currentSession === session) await loadHabits()
  }

  function findCheck(habitId) {
    return checks.value.find(check => check.habit === habitId)
  }

  function isChecked(habitId) {
    return confirmedChecks.get(habitId) ?? Boolean(findCheck(habitId))
  }

  async function toggleCheck(habitId) {
    const currentSession = session
    const existingCheck = findCheck(habitId)
    if (existingCheck) {
      await request(checksPath + existingCheck.id, 'ذخیرهٔ وضعیت تیک انجام نشد.', { method: 'DELETE' })
    } else {
      await request(checksPath, 'ذخیرهٔ وضعیت تیک انجام نشد.', {
        method: 'POST',
        data: { habit: habitId },
      })
    }
    if (currentSession !== session) return

    confirmedChecks.set(habitId, !existingCheck)
    await loadChecks({ afterSave: true })
  }

  return {
    habits, checks, checksReady, habitLoadError, checkLoadError,
    loadHabits, loadChecks, createHabit, deleteHabit, isChecked, toggleCheck,
  }
})
