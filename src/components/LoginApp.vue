    <template>
    <div class="Authentication">

                    <div class="login_form">
                        <h3>Login</h3>
                        <input v-model="loginUsername" id="user" type="text" placeholder="username">
                        <input v-model="loginPassword" id="password" type="password" placeholder="password">
                        <button @click="login" id="login_button" class="login_button" :disabled="loginPending">login</button>
                        <p v-if="loginError" class="auth-error" role="alert" dir="rtl">{{ loginError }}</p>

                    </div>

                <div class="register_form">
                    <h3>Registerr</h3>
                        <input v-model="username" id="register_user" class="register_user" type="text" placeholder="username">
                        <input v-model="email" id="register_email" class="register_email" type="email">
                        <input v-model="password" id="register_password" type="password"  placeholder=" password">
                        <button @click="register" id="register_button" class="register_button" :disabled="registerPending">register</button>
                        <p v-if="registerError" class="auth-error" role="alert" dir="rtl">{{ registerError }}</p>
                        <p v-if="registerMessage" role="status" dir="rtl">{{ registerMessage }}</p>

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
    const registerPending = ref(false)
    const registerError = ref('')
    const registerMessage = ref('')
    const emit = defineEmits(['login'])

    async function sendRequest(path, details) {
        const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details),
        }).catch(() => null)

        if (!response) throw new Error('ارتباط با سرور برقرار نشد. دوباره تلاش کنید.')
        if (response.status === 404) throw new Error('مسیر درخواست روی سرور پیدا نشد.')
        if (response.status === 429) throw new Error('تعداد درخواست‌ها زیاد است. کمی صبر کنید.')
        if (response.status >= 500) throw new Error('سرور پاسخ درستی نداد. دوباره تلاش کنید.')

        return response
    }

    async function register() {
        if (registerPending.value) return
        registerError.value = ''
        registerMessage.value = ''

        const details = {
            username: username.value.trim(),
            email: email.value.trim(),
            password: password.value,
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
            const response = await sendRequest('/accounts/register', details)
            if (!response.ok) throw new Error('ثبت‌نام انجام نشد. دوباره تلاش کنید.')

            username.value = ''
            email.value = ''
            password.value = ''
            registerMessage.value = 'ثبت‌نام انجام شد. حالا می‌توانید وارد شوید.'
        } catch (error) {
            registerError.value = error.message
        } finally {
            registerPending.value = false
        }
    }

    async function login() {
        if (loginPending.value) return
        loginError.value = ''

        const details = { username: loginUsername.value.trim(), password: loginPassword.value }
        if (!details.username || !details.password) {
            loginError.value = 'نام کاربری و رمز عبور را وارد کنید.'
            return
        }

        loginPending.value = true
        try {
            const response = await sendRequest('/accounts/login', details)
            if ([400, 401, 403, 422].includes(response.status)) {
                throw new Error('ورود پذیرفته نشد. نام کاربری و رمز عبور را بررسی کنید.')
            }
            const failedLogin = 'ورود انجام نشد. دوباره تلاش کنید.'
            if (!response.ok) throw new Error(failedLogin)

            const data = await response.json().catch(() => null)
            if (typeof data?.token !== 'string' || !data.token.trim()) throw new Error(failedLogin)

            try {
                localStorage.setItem('userToken', data.token)
            } catch {
                throw new Error(failedLogin)
            }
            emit('login', data.token)
        } catch (error) {
            loginError.value = error.message
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


.Authentication .auth-error {
    margin: 8px 0;
    color: #ffb8b8;
}

    </style>

