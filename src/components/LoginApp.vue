    <template>
    <div class="Authentication">

                    <div class="login_form">
                        <h3>Login</h3>
                        <input v-model="loginUsername" id="user" type="text" placeholder="username">
                        <input v-model="loginPassword" id="password" type="password" placeholder="password">
                        <button @click="login" id="login_button" class="login_button" :disabled="loginPending">login</button>
                        <p v-if="loginError" role="alert">{{ loginError }}</p>

                    </div>

                <div class="register_form">
                    <h3>Registerr</h3>
                        <input v-model="username" id="register_user" class="register_user" type="text" placeholder="username">
                        <input v-model="email" id="register_email" class="register_email" type="text">
                        <input v-model="password" id="register_password" type="password"  placeholder=" password">
                        <button @click="register" id="register_button" class="register_button">register</button>
                        <p>Username = {{username}}</p>
                </div>
            </div>
    </template>
    <script setup>
    import { ref } from 'vue'

    const loginUsername = ref('')
    const loginPassword = ref('')
    const loginPending = ref(false)
    const loginError = ref('')
    const username = ref('')
    const email = ref('')
    const password = ref('')
    const emit = defineEmits(['login'])

  async function sendRegistration(details) {
    const response = await fetch('/accounts/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    })
    const data = await response.json()
    if (!response.ok)
    return data
  }

  async function sendLogin(details) {
    const response = await fetch('/accounts/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    })
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('مسیر ورود در سرور پیدا نشد.')
      }
      if (response.status >= 500) {
        throw new Error('سرور هنگام ورود خطا داد. دوباره تلاش کنید.')
      }
      throw new Error('ورود ناموفق بود. نام کاربری و رمز را بررسی کنید.')
    }
    const data = await response.json().catch(() => null)
    if (!data?.token) {
      throw new Error('سرور توکن ورود ارسال نکرد.')
    }
    localStorage.setItem('userToken', data.token)
    emit('login', data.token)
  }



    async function register() {
        await sendRegistration({ username: username.value, email: email.value, password: password.value })
        username.value = ''
        email.value = ''
        password.value = ''
    }
    async function login() {
        if (loginPending.value) return
        loginPending.value = true
        loginError.value = ''
        try {
            await sendLogin({ username: loginUsername.value, password: loginPassword.value })
        } catch (error) {
            loginError.value = error instanceof TypeError
                ? 'ارتباط با سرور برقرار نشد.'
                : error.message
        } finally {
            loginPending.value = false
        }
    }
    </script>

    <style>
body {

    background-color: #FEF3E2;
    margin: 0;
    padding: 20px;
    color: #ffffff;
}
    .Authentication{
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 900px;
    margin: 0 auto 30px;
    padding:8px;
    background:#2A1A0E;
}


    </style>

