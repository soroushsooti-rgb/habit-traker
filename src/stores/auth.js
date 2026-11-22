import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(readStoredToken())
  const isLoggedIn = computed(() => Boolean(token.value))

  function readStoredToken() {
    try {
      return localStorage.getItem('userToken') || ''
    } catch {
      return ''
    }
  }

  async function postAccount(path, details) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    }).catch(() => null)

    if (!response) throw new Error('ارتباط با سرور برقرار نشد. دوباره تلاش کنید.')
    if (response.status === 404) throw new Error('مسیر درخواست روی سرور پیدا نشد.')
    if (response.status === 429) throw new Error('تعداد درخواست‌ها زیاد است. کمی صبر کنید.')
    if (response.status >= 500) throw new Error('سرور پاسخ درستی نداد. دوباره تلاش کنید.')

    return response
  }

  async function login(details) {
    const response = await postAccount('/accounts/login', details)
    if ([400, 401, 403, 422].includes(response.status)) {
      throw new Error('ورود پذیرفته نشد. نام کاربری و رمز عبور را بررسی کنید.')
    }

    const failureMessage = 'ورود انجام نشد. دوباره تلاش کنید.'
    if (!response.ok) throw new Error(failureMessage)

    const data = await response.json().catch(() => null)
    const receivedToken = data?.token
    if (typeof receivedToken !== 'string' || !receivedToken.trim()) throw new Error(failureMessage)

    try {
      localStorage.setItem('userToken', receivedToken)
    } catch {
      throw new Error(failureMessage)
    }
    token.value = receivedToken
  }

  async function register(details) {
    const response = await postAccount('/accounts/register', details)
    if (!response.ok) throw new Error('ثبت‌نام انجام نشد. دوباره تلاش کنید.')
  }

  async function logout() {
    const currentToken = token.value
    if (!currentToken) return

    const response = await fetch('/accounts/logout', {
      method: 'POST',
      headers: { Authorization: 'Token ' + currentToken },
    }).catch(() => null)

    if (!response) throw new Error('ارتباط با سرور برقرار نشد.')
    if (!response.ok && response.status !== 401) throw new Error('خروج انجام نشد.')
    if (token.value !== currentToken) return

    localStorage.removeItem('userToken')
    token.value = ''
  }

  return { token, isLoggedIn, login, register, logout }
})
