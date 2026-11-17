    <template>
    <div class="Authentication">

                    <div class="login_form">
                        <h3>Login</h3>
                        <input v-model="loginUsername" id="user" type="text" placeholder="username">
                        <input v-model="loginPassword" id="password" type="password" placeholder="password">
                        <button @click="login" id="login_button" class="login_button">login</button>

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
    if (!response.ok) {
      const message = Object.entries(data).map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`).join('\n')
      throw new Error(message || 'Registration failed.')
    }
    return data
  }

  async function sendLogin(details) {
    const response = await fetch('/accounts/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    })
    const data = await response.json()
    if (!response.ok || !data.token) {
      throw new Error('password not set')
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
        await sendLogin({ username: loginUsername.value, password: loginPassword.value })
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

