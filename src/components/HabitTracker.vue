<template>
    <button @click="logout" id="logout_button" type="button">Logout</button>
    <p v-if="logoutError" class="habit-error" role="alert" dir="rtl">{{ logoutError }}</p>

    <form @submit.prevent="postform" id="habit-form" class="Habit" novalidate>
        <input v-model="habitname" id="habit-name" name="name" type="text" placeholder="Habit name" required>
        <div>
            <div class="freq">
                <select v-model="mood" id="habit-freq" name="frequency">
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                </select>
            </div>

            <div v-if="mood === 'DAILY'">
                <label>
                    Reminder:
                    <input v-model="habitreminder" id="habit-reminder" name="reminder_time" type="time">
                </label>
            </div>

            <div v-if="mood === 'WEEKLY'" id="weekly-fields">
                <label>
                    Day of week:
                    <select v-model="habitdayweek" id="habit-day-week" name="day_of_week">
                        <option value="5">Saturday</option>
                        <option value="6">Sunday</option>
                        <option value="0">Monday</option>
                        <option value="1">Tuesday</option>
                        <option value="2">Wednesday</option>
                        <option value="3">Thursday</option>
                        <option value="4">Friday</option>
                    </select>
                </label>
            </div>

            <div v-if="mood === 'MONTHLY'" id="monthly-fields">
                <label>
                    Day of month:
                    <input v-model="day_of_month" id="habit-day-month" name="day_of_month" type="number" min="1" max="31">
                </label>
            </div>
        </div>
        <button id="create_habit_button" type="submit">Create habit</button>
        <p v-if="formError" class="habit-error" role="alert" dir="rtl">{{ formError }}</p>
    </form>

    <div class="check">
    <p v-if="habitLoadError" class="habit-error" role="alert" dir="rtl">{{ habitLoadError }}</p>
    <button v-if="habitLoadError" type="button" @click="gethabit">دریافت دوبارهٔ عادت‌ها</button>
    <p v-if="checkLoadError" class="habit-error" role="alert" dir="rtl">{{ checkLoadError }}</p>
    <button v-if="checkLoadError" type="button" @click="getchecks">دریافت دوبارهٔ وضعیت تیک‌ها</button>
    <p v-if="listError" class="habit-error" role="alert" dir="rtl">{{ listError }}</p>
    <ul id="habit-list">
        <li v-for="habit in habits" :key="habit.id">
        <input
        type="checkbox"
        :checked="Boolean(findCheck(habit.id))"
        :disabled="!checksReady"
        @change="toggleCheck(habit.id, $event)"
        >

        {{ habit.name }}

        <button type="button" @click="deletehabit(habit.id)">
        Delete
        </button>
        </li>
    </ul>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const checks = ref([])
const habitname = ref ('')
const habitreminder = ref('');
const habitdayweek = ref('5');
const day_of_month = ref('')
const mood = ref('DAILY');
const props = defineProps({ token: { type: String, required: true } });
const emit = defineEmits(['logout']);
const habits = ref([])


const logoutError = ref('')
const formError = ref('')
const habitLoadError = ref('')
const checkLoadError = ref('')
const listError = ref('')
const checksReady = ref(false)

async function request(path, failureMessage, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { Authorization: `Token ${props.token}`, ...options.headers },
  }).catch(() => null)

  if (!response) throw new Error('ارتباط با سرور برقرار نشد.')
  if (response.status === 401 && path !== '/accounts/logout') {
    throw new Error('نشست شما معتبر نیست. دوباره وارد شوید.')
  }
  if (!response.ok && !(path === '/accounts/logout' && response.status === 401)) {
    throw new Error(failureMessage)
  }
  return response
}

async function readList(response) {
  const data = await response.json().catch(() => null)
  if (!Array.isArray(data)) throw new Error('پاسخ سرور قابل خواندن نیست.')
  return data
}

async function logout() {
  logoutError.value = ''
  try {
    await request('/accounts/logout', 'خروج انجام نشد.', { method: 'POST' })
    localStorage.removeItem('userToken')
    emit('logout')
  } catch (error) {
    logoutError.value = error.message || 'خروج انجام نشد.'
  }
}

async function gethabit() {
  habitLoadError.value = ''
  try {
    habits.value = await readList(await request('/habit/habits/', 'دریافت فهرست عادت‌ها انجام نشد.'))
  } catch (error) {
    habitLoadError.value = error.message
  }
}

async function getchecks() {
  checkLoadError.value = ''
  try {
    checks.value = await readList(await request('/habit/checks/', 'دریافت وضعیت تیک‌ها انجام نشد.'))
    checksReady.value = true
  } catch (error) {
    checksReady.value = false
    checkLoadError.value = error.message
  }
}

onMounted(gethabit)
onMounted(getchecks)

async function deletehabit(id) {
  listError.value = ''
  try {
    await request(`/habit/habits/${id}`, 'حذف عادت انجام نشد.', { method: 'DELETE' })
    await gethabit()
  } catch (error) {
    listError.value = error.message
  }
}

function findCheck(habitId) {
  return checks.value.find(check => check.habit === habitId)
}

async function toggleCheck(habitId, event) {
  const checkbox = event.target
  const existingCheck = findCheck(habitId)
  const url = existingCheck ? `/habit/checks/${existingCheck.id}` : '/habit/checks/'

  listError.value = ''
  try {
    await request(url, 'ذخیرهٔ وضعیت تیک انجام نشد.', {
      method: existingCheck ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: existingCheck ? undefined : JSON.stringify({ habit: habitId }),
    })
    await getchecks()
  } catch (error) {
    listError.value = error.message
  } finally {
    checkbox.checked = Boolean(findCheck(habitId))
  }
}

async function postform() {
  formError.value = ''
  const details = {
    name: habitname.value.trim(),
    frequency: mood.value,
  }

  if (!details.name) {
    formError.value = 'نام عادت را وارد کنید.'
    return
  }

  if (mood.value === 'DAILY') {
    if (!habitreminder.value) {
      formError.value = 'ساعت یادآوری را وارد کنید.'
      return
    }
    details.reminder_time = habitreminder.value
  } else if (mood.value === 'WEEKLY') {
    details.day_of_week = Number(habitdayweek.value)
  } else if (mood.value === 'MONTHLY') {
    const day = Number(day_of_month.value)
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      formError.value = 'روز ماه باید عددی بین ۱ تا ۳۱ باشد.'
      return
    }
    details.day_of_month = day
  }

  try {
    await request('/habit/habits/', 'ساخت عادت انجام نشد.', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    })

    habitname.value = ''
    habitreminder.value = ''
    habitdayweek.value = '5'
    day_of_month.value = ''
    await gethabit()
  } catch (error) {
    formError.value = error.message
  }
}

</script>

<style>
body {
    background-color: #FEF3E2;
    margin: 0;
    padding: 20px;
    color: #2A1A0E;
}

.Habit, .check {
    max-width: 900px;
    margin: 0 auto 30px;
    padding: 16px;
    background: #2A1A0E;
    color: #ffffff;
}

.Habit {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.btn-check {
    background-color: #555;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 16px;
    margin-right: 8px;
    transition: background-color 0.2s ease;
}

.btn-check.is-checked {
    background-color: #27ae60;
}

.btn-delete {
    background-color: #c0392b;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 6px 10px;
    cursor: pointer;
}

.btn-delete:hover {
    background-color: #e74c3c;
}

.staging-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #3e2715;
    padding: 10px 14px;
    margin-bottom: 8px;
    border-radius: 6px;
    list-style: none;
}
.habit-error {
    flex-basis: 100%;
    margin: 8px 0;
    color: #ffb8b8;
}

#logout_button + .habit-error {
    color: #9f2020;
}
</style>
