<template>
    <button @click="logout" id="logout_button" type="button">Logout</button>

    <form @submit.prevent="postform" id="habit-form" class="Habit">
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
        <button id="create_habit_button" type="submit">Create habit</button>
    </form>

    <div class="check">
    <ul id="habit-list">
        <li v-for="habit in habits" :key="habit.id">
        <input
        type="checkbox"
        :checked="Boolean(findCheck(habit.id))"
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


  async function sendLogout() {
    const response = await fetch('/accounts/logout', {
      method: 'POST',
      headers: { Authorization: `Token ${props.token}` },
    })
    if (!response.ok && response.status !== 401) {
      return
    }
    localStorage.removeItem('userToken')
    emit('logout')
  }
const logout = async () => {
  await sendLogout();
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//showhabit
async function gethabit() {
  const response = await fetch('/habit/habits/', {
    method: 'GET',
    headers: {
      Authorization: `Token ${props.token}`,
    },
  })

  if (!response.ok) {
    return
  }

  habits.value = await response.json()
}
onMounted(gethabit)

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//deletehabit
async function deletehabit(id) {
  const response = await fetch(`/habit/habits/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Token ${props.token}`,
    },
  })

  if (!response.ok) {
    return
  }

  await gethabit()
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//GET checks-habit
async function getchecks() {
  const response = await fetch('/habit/checks/', {
    headers: {
      Authorization: `Token ${props.token}`,
    },
  })

  if (!response.ok) {
    return
  }

  checks.value = await response.json()
}

onMounted(getchecks)

function findCheck(habitId) {
  return checks.value.find(check => check.habit === habitId)
}
async function toggleCheck(habitId, event) {
  const checkbox = event.target
  const existingCheck = findCheck(habitId)

  const url = existingCheck
    ? `/habit/checks/${existingCheck.id}`
    : '/habit/checks/'

  const response = await fetch(url, {
    method: existingCheck ? 'DELETE' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${props.token}`,
    },
    body: existingCheck
      ? undefined
      : JSON.stringify({ habit: habitId }),
  })

  if (!response.ok) {
    checkbox.checked = Boolean(existingCheck)
    return
  }

  await getchecks()
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// create habit
async function postform() {
  const name = habitname.value.trim()
  if (!name) {
    return
  }

  const details = { name, frequency: mood.value }

  if (mood.value === 'DAILY') {
    if (!habitreminder.value) {
      return
    }
    details.reminder_time = habitreminder.value
  } else if (mood.value === 'WEEKLY') {
    details.day_of_week = Number(habitdayweek.value)
  } else if (mood.value === 'MONTHLY') {
    const day = Number(day_of_month.value)
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return
    }
    details.day_of_month = day
  }

  const response = await fetch('/habit/habits/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${props.token}`,
    },
    body: JSON.stringify(details),
  })

  if (!response.ok) {
    return
  }

  habitname.value = ''
  habitreminder.value = ''
  habitdayweek.value = '5'
  day_of_month.value = ''
  await gethabit()
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
</style>
