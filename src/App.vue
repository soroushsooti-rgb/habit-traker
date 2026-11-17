
<template>
  <main>
    <HabitView v-if="token" :token="token" @logout="token = ''" />
    <AuthView v-else @login="token = $event" />
  </main>
</template>

<script setup>
import AuthView from "./components/LoginApp.vue";
import HabitView from "./components/HabitTracker.vue";
import { ref } from "vue";

const token = ref(localStorage.getItem('userToken') || '')

</script>
