<template>
    <button @click="logout" id="logout_button" type="button">Logout</button>

    <form id="habit-form" class="Habit">
        <input v-model="habitname" id="habit-name" name="name" type="text" placeholder="Habit name" required>
        <div>
            <div class="freq">
                <select v-model="mood" id="habit-freq" name="frequency">
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                </select>
            </div>

            <div>
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
        <button @click="postform" id="create_habit_button" type="submit">Create habit</button>
    </form>

    <div class="check">
        <h1>My Habits</h1>
        <ul id="habit-list"></ul>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const habitname = ref ('')
const habitreminder = ref('');
const habitdayweek = ref('5');
const day_of_month = ref('day_of_month')
const mood = ref('DAILY');
const auth = useAuthStore();

  async function sendLogout() {
    const response = await fetch('/accounts/logout', {
      method: 'POST',
      headers: { Authorization: `Token ${auth.token}` },
    })
    if (!response.ok && response.status !== 401) {
      throw new Error('خروج انجام نشد. دوباره تلاش کنید.')
    }
    localStorage.removeItem('userToken')
    auth.token = ''
  }


const logout = async () => {
  await sendLogout();
};

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
</style>
