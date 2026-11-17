
<template>
  <main>
    <HabitView v-if="auth.token" />
    <AuthView v-else />
  </main>
</template>

<script setup>
import AuthView from "./components/LoginApp.vue";
import HabitView from "./components/HabitTracker.vue";
import { useAuthStore } from "./stores/auth";

const auth = useAuthStore();
</script>
