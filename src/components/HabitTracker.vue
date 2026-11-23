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

    <button id="create_habit_button" type="submit" :disabled="createPending">
      {{ createPending ? 'Creating…' : 'Create habit' }}
    </button>
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
            :checked="pendingChecks.get(habit.id) ?? habitStore.isChecked(habit.id)"
            :disabled="!checksReady || pendingChecks.has(habit.id)"
            @change="toggleCheck(habit.id)"
          >
          {{ habit.name }}
        </label>
        <button type="button" @click="askToDelete(habit)" :disabled="deletePending">Delete</button>
      </li>
    </ul>
  </div>
  <!-- حذف عادت فقط بعد از انتخاب «بله» انجام می‌شود. -->
  <dialog ref="deleteDialog" class="delete-dialog" dir="rtl" aria-labelledby="delete-question" @close="habitToDelete = null">
    <p id="delete-question">آیا از پاک کردن این عادت مطمئن هستید؟</p>
    <p v-if="habitToDelete" class="delete-habit-name">{{ habitToDelete.name }}</p>
    <div class="delete-actions">
      <button type="button" autofocus @click="deleteDialog.close()">خیر</button>
      <button type="button" @click="confirmDelete">بله</button>
    </div>
  </dialog>
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
const createPending = ref(false)
const listError = ref('')
const deleteDialog = ref(null)
const habitToDelete = ref(null)
const deletePending = ref(false)
const pendingChecks = reactive(new Map())

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
  if (createPending.value) return

  formError.value = ''
  createPending.value = true
  try {
    await habitStore.createHabit(habitDetails())
    Object.assign(form, formDefaults)
  } catch (error) {
    formError.value = error.message
  } finally {
    createPending.value = false
  }
}

function askToDelete(habit) {
  habitToDelete.value = habit
  deleteDialog.value.showModal()
}

async function confirmDelete() {
  if (!deleteDialog.value.open || !habitToDelete.value || deletePending.value) return

  const id = habitToDelete.value.id
  deletePending.value = true
  deleteDialog.value.close()
  listError.value = ''
  try {
    await habitStore.deleteHabit(id)
  } catch (error) {
    listError.value = error.message
  } finally {
    deletePending.value = false
  }
}

// تا پایان درخواست، وضعیت موقت تیک را در Vue نگه می‌داریم.
async function toggleCheck(habitId) {
  if (!checksReady.value || pendingChecks.has(habitId)) return

  pendingChecks.set(habitId, !habitStore.isChecked(habitId))
  listError.value = ''
  try {
    await habitStore.toggleCheck(habitId)
  } catch (error) {
    listError.value = error.message
  } finally {
    // بعد از درخواست، چک‌باکس دوباره وضعیت تأییدشدهٔ Pinia را نشان می‌دهد.
    pendingChecks.delete(habitId)
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

.delete-dialog {
  box-sizing: border-box;
  width: min(340px, calc(100% - 32px));
  padding: 20px;
  border: 1px solid #d6c2ad;
  border-radius: 8px;
  color: #2a1a0e;
  background: #fef3e2;
}

.delete-dialog::backdrop {
  background: rgb(0 0 0 / 45%);
}

.delete-dialog p {
  margin: 0 0 10px;
}

.delete-habit-name {
  overflow-wrap: anywhere;
  font-weight: bold;
}

.delete-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.delete-actions button {
  padding: 4px 12px;
}
</style>
