<template>
  <!-- خروج از حساب و نمایش خطای خروج -->
  <div>
    <button id="logout_button" type="button" @click="logout">Logout</button>
    <p v-if="logoutError" class="logout-error" role="alert" dir="rtl">{{ logoutError }}</p>
  </div>

  <!-- فرم ساخت عادت؛ فیلدهای زمان‌بندی به دورهٔ انتخاب‌شده بستگی دارند. -->
  <form id="habit-form" class="habit-form" novalidate @submit.prevent="createHabit">
    <input v-model="form.name" id="habit-name" name="name" type="text" placeholder="Habit name" aria-label="Habit name" required>
    <div>
      <select v-model="form.frequency" id="habit-freq" name="frequency" aria-label="Frequency">
        <option value="DAILY">Daily</option>
        <option value="WEEKLY">Weekly</option>
        <option value="MONTHLY">Monthly</option>
      </select>

      <div v-if="form.frequency === 'DAILY'">
        <label>
          Reminder:
          <input v-model="form.reminderTime" id="habit-reminder" name="reminder_time" type="time" required>
        </label>
      </div>

      <div v-else-if="form.frequency === 'WEEKLY'" id="weekly-fields">
        <label>
          Day of week:
          <select v-model.number="form.dayOfWeek" id="habit-day-week" name="day_of_week">
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

      <div v-else-if="form.frequency === 'MONTHLY'" id="monthly-fields">
        <label>
          Day of month:
          <input v-model.number="form.dayOfMonth" id="habit-day-month" name="day_of_month" type="number" min="1" max="31" required>
        </label>
      </div>
    </div>

    <button id="create_habit_button" type="submit">Create habit</button>
    <p v-if="formError" class="habit-error" role="alert" dir="rtl">{{ formError }}</p>
  </form>

  <!-- فهرست عادت‌ها، وضعیت تیک‌ها و امکان تلاش دوباره در صورت خطا -->
  <div class="habit-list">
    <p v-if="habitLoadError" class="habit-error" role="alert" dir="rtl">{{ habitLoadError }}</p>
    <button v-if="habitLoadError" type="button" @click="habitStore.loadHabits()">دریافت دوبارهٔ عادت‌ها</button>

    <p v-if="checkLoadError" class="habit-error" role="alert" dir="rtl">{{ checkLoadError }}</p>
    <button v-if="checkLoadError" type="button" @click="habitStore.loadChecks()">دریافت دوبارهٔ وضعیت تیک‌ها</button>

    <p v-if="listError" class="habit-error" role="alert" dir="rtl">{{ listError }}</p>

    <ul id="habit-list">
      <li v-for="habit in habits" :key="habit.id">
        <label>
          <input
            type="checkbox"
            :checked="habitStore.isChecked(habit.id)"
            :disabled="!checksReady"
            @change="toggleCheck(habit.id, $event)"
          >
          {{ habit.name }}
        </label>
        <button type="button" @click="deleteHabit(habit.id)">Delete</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { useHabitsStore } from '../stores/habits'

const auth = useAuthStore()
const habitStore = useHabitsStore()
const { habits, checksReady, habitLoadError, checkLoadError } = storeToRefs(habitStore)

const formDefaults = { name: '', reminderTime: '', dayOfWeek: 5, dayOfMonth: '' }
const form = reactive({ ...formDefaults, frequency: 'DAILY' })

// خطاها جدا نگه داشته می‌شوند تا هر پیام در بخش مربوط به خودش دیده شود.
const logoutError = ref('')
const formError = ref('')
const listError = ref('')

// اعتبارسنجی فرم و ساخت دادهٔ مناسب برای دورهٔ روزانه، هفتگی یا ماهانه
function habitDetails() {
  const name = form.name.trim()
  if (!name) throw new Error('نام عادت را وارد کنید.')

  const details = { name, frequency: form.frequency }

  switch (form.frequency) {
    case 'DAILY':
      if (!form.reminderTime) throw new Error('ساعت یادآوری را وارد کنید.')
      return { ...details, reminder_time: form.reminderTime }
    case 'WEEKLY':
      return { ...details, day_of_week: form.dayOfWeek }
    case 'MONTHLY':
      if (!Number.isInteger(form.dayOfMonth) || form.dayOfMonth < 1 || form.dayOfMonth > 31) {
        throw new Error('روز ماه باید عددی بین ۱ تا ۳۱ باشد.')
      }
      return { ...details, day_of_month: form.dayOfMonth }
    default:
      throw new Error('دورهٔ عادت را انتخاب کنید.')
  }
}

// فرستادن عادت جدید به سرور و پاک کردن فیلدها پس از موفقیت
async function createHabit() {
  formError.value = ''
  try {
    await habitStore.createHabit(habitDetails())
    Object.assign(form, formDefaults)
  } catch (error) {
    formError.value = error.message
  }
}

async function deleteHabit(id) {
  listError.value = ''
  try {
    await habitStore.deleteHabit(id)
  } catch (error) {
    listError.value = error.message
  }
}

// در صورت وجود تیک آن را حذف می‌کنیم؛ در غیر این صورت تیک تازه می‌سازیم.
async function toggleCheck(habitId, event) {
  const checkbox = event.target

  listError.value = ''
  try {
    await habitStore.toggleCheck(habitId)
  } catch (error) {
    listError.value = error.message
  } finally {
    // ظاهر چک‌باکس را با آخرین وضعیت دریافت‌شده از سرور هماهنگ نگه می‌داریم.
    checkbox.checked = habitStore.isChecked(habitId)
  }
}

// بعد از پایان نشست، توکن مرورگر پاک می‌شود و App.vue فرم ورود را نشان می‌دهد.
async function logout() {
  logoutError.value = ''
  try {
    await auth.logout()
  } catch (error) {
    logoutError.value = error.message || 'خروج انجام نشد.'
  }
}

// هنگام باز شدن صفحه، عادت‌ها و وضعیت تیک‌ها هم‌زمان دریافت می‌شوند.
onMounted(() => Promise.all([habitStore.loadHabits(), habitStore.loadChecks()]))
</script>

<!-- استایل عمومی صفحه؛ استایل‌های بخش عادت‌ها در بلوک scoped هستند. -->
<style>
body {
  margin: 0;
  padding: 20px;
  background: #fef3e2;
  color: #2a1a0e;
}
</style>

<style scoped>
.habit-form,
.habit-list {
  max-width: 900px;
  margin: 0 auto 30px;
  padding: 16px;
  background: #2a1a0e;
  color: #fff;
}

.habit-form {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.habit-error,
.logout-error {
  margin: 8px 0;
}

.habit-error {
  flex-basis: 100%;
  color: #ffb8b8;
}

.logout-error {
  color: #9f2020;
}
</style>
