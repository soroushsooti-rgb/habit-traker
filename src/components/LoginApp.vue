<template>
  <div class="auth-forms">
    <!-- فرم ورود: دریافت نام کاربری و رمز عبور -->
    <form novalidate @submit.prevent="login">
      <h3>Login</h3>
      <p v-if="auth.sessionNotice" class="auth-error" role="alert" dir="rtl">{{ auth.sessionNotice }}</p>
      <input v-model="loginUsername" id="user" type="text" placeholder="username" aria-label="Username" autocomplete="username" required>
      <input v-model="loginPassword" id="password" type="password" placeholder="password" aria-label="Password" autocomplete="current-password" required>
      <button id="login_button" type="submit" :disabled="loginPending">Login</button>
      <p v-if="loginError" class="auth-error" role="alert" dir="rtl">{{ loginError }}</p>
    </form>

    <!-- فرم ثبت‌نام: پیام خطا یا موفقیت زیر همین فرم نمایش داده می‌شود. -->
    <form novalidate @submit.prevent="register">
      <h3>Register</h3>
      <input v-model="registerUsername" id="register_user" type="text" placeholder="username" aria-label="Username" autocomplete="username" required>
      <input v-model="registerEmail" id="register_email" type="email" placeholder="email" aria-label="Email" autocomplete="email" required>
      <input v-model="registerPassword" id="register_password" type="password" placeholder="password" aria-label="Password" autocomplete="new-password" required>
      <button id="register_button" type="submit" :disabled="registerPending">Register</button>
      <p v-if="registerError" class="auth-error" role="alert" dir="rtl">{{ registerError }}</p>
      <p v-if="registerMessage" role="status" dir="rtl">{{ registerMessage }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'

import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

// ورودی‌ها، پیام خطا و وضعیت ارسال فرم ورود
const loginUsername = ref('')
const loginPassword = ref('')
const loginPending = ref(false)
const loginError = ref('')

// وضعیت فرم ثبت‌نام مستقل از فرم ورود است.
const registerUsername = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const registerPending = ref(false)
const registerError = ref('')
const registerMessage = ref('')

// اعتبارسنجی ورودی‌ها، دریافت توکن و ذخیرهٔ آن برای درخواست‌های بعدی
async function login() {
  if (loginPending.value) return

  loginError.value = ''
  const details = {
    username: loginUsername.value.trim(),
    password: loginPassword.value,
  }

  if (!details.username || !details.password) {
    loginError.value = 'نام کاربری و رمز عبور را وارد کنید.'
    return
  }

  loginPending.value = true
  try {
    await auth.login(details)
  } catch (error) {
    loginError.value = error.message
  } finally {
    loginPending.value = false
  }
}

// ساخت حساب؛ فرم فقط پس از پاسخ موفق پاک می‌شود.
async function register() {
  if (registerPending.value) return

  registerError.value = ''
  registerMessage.value = ''
  const details = {
    username: registerUsername.value.trim(),
    email: registerEmail.value.trim(),
    password: registerPassword.value,
  }

  if (!details.username || !details.email || !details.password) {
    registerError.value = 'نام کاربری، ایمیل و رمز عبور را وارد کنید.'
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
    registerError.value = 'ایمیل را به شکل درست وارد کنید.'
    return
  }

  registerPending.value = true
  try {
    await auth.register(details)

    registerUsername.value = ''
    registerEmail.value = ''
    registerPassword.value = ''
    registerMessage.value = 'ثبت‌نام انجام شد. حالا می‌توانید وارد شوید.'
  } catch (error) {
    registerError.value = error.message
  } finally {
    registerPending.value = false
  }
}
</script>

<style scoped>
.auth-forms {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  max-width: 900px;
  margin: 0 auto 30px;
  padding: 8px;
  background: #2a1a0e;
  color: #fff;
}

.auth-error {
  margin: 8px 0;
  color: #ffb8b8;
}
</style>
