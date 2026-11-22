<template>
  <main>
    <HabitView v-if="isLoggedIn" />
    <AuthView v-else />
  </main>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import AuthView from './components/LoginApp.vue'
import HabitView from './components/HabitTracker.vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const { isLoggedIn } = storeToRefs(auth)
</script>
