const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const { test } = require('node:test')
const { transformSync } = require('@babel/core')
const { compileScript, parse } = require('vue/compiler-sfc')
const { createPinia } = require('pinia')
const { createRenderer, nextTick } = require('vue')

const modules = new Map()

function load(file) {
  const filename = path.resolve(__dirname, '..', file)
  if (modules.has(filename)) return modules.get(filename)

  let source = readFileSync(filename, 'utf8')
  if (file.endsWith('.vue')) {
    const { descriptor } = parse(source, { filename })
    source = compileScript(descriptor, { id: file }).content
  }
  const { code } = transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  })
  const exports = {}
  const requireFromFile = createRequire(filename)
  const resolveModule = id => id.startsWith('.')
    ? load(path.relative(path.resolve(__dirname, '..'), requireFromFile.resolve(id)))
    : requireFromFile(id)

  new Function('exports', 'require', code)(exports, resolveModule)
  modules.set(filename, exports)
  return exports
}

const { useAuthStore } = load('src/stores/auth.js')
const { useHabitsStore } = load('src/stores/habits.js')
const HabitTracker = load('src/components/HabitTracker.vue').default

const respond = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
})

function setup(t, fetch) {
  const saved = new Map([['userToken', 'test-token']])
  t.mock.method(global, 'fetch', fetch)
  const storage = { getItem: k => saved.get(k), removeItem: k => saved.delete(k), setItem: (k, v) => saved.set(k, v) }
  const original = Object.getOwnPropertyDescriptor(global, 'localStorage')
  Object.defineProperty(global, 'localStorage', { configurable: true, value: storage })
  t.after(() => {
    if (original) Object.defineProperty(global, 'localStorage', original)
    else delete global.localStorage
  })
  const pinia = createPinia()
  return { pinia, saved, auth: useAuthStore(pinia), habits: useHabitsStore(pinia) }
}

test('a second form submission cannot send another POST while the first is pending', async t => {
  let release
  let posts = 0
  let rejectSave = false
  const { pinia } = setup(t, async (url, options) => {
    if (options.method !== 'POST') return respond(200, [])
    posts += 1
    assert.equal(url, '/habit/habits/')
    if (rejectSave) return respond(500)
    return new Promise(resolve => { release = resolve })
  })

  // Mount the component setup in Vue without a browser; no DOM is needed for this action.
  const renderer = createRenderer({ createComment: () => ({}), insert() {}, remove() {} })
  const app = renderer.createApp({ ...HabitTracker, render: () => null }).use(pinia)
  const vm = app.mount({})
  t.after(() => app.unmount())
  const state = vm.$.setupState
  state.form.name = 'Walk'
  state.form.reminderTime = '09:00'

  const first = state.createHabit()
  assert.equal(state.createPending, true)
  await state.createHabit()
  assert.equal(posts, 1)
  release(respond(201))
  await first
  assert.equal(state.createPending, false)
  assert.equal(state.form.name, '')

  state.form.name = 'Read'
  state.form.reminderTime = '08:30'
  rejectSave = true
  await state.createHabit()
  assert.equal(posts, 2)
  assert.equal(state.createPending, false)
  assert.equal(state.form.name, 'Read')
  assert.notEqual(state.formError, '')
})

test('saved check and uncheck stay visible when the follow-up GET fails', async t => {
  let listStatus = 200
  let checks = []
  const { habits } = setup(t, async (url, { method }) => {
    if (method === 'POST') { checks = [{ id: 7, habit: 1 }]; return respond(201) }
    if (method === 'DELETE') { assert.equal(url, '/habit/checks/7'); checks = []; return respond(204) }
    return respond(listStatus, checks)
  })

  await habits.loadChecks()
  listStatus = 500
  await habits.toggleCheck(1)
  assert.equal(habits.isChecked(1), true)
  assert.equal(habits.checksReady, false)
  assert.match(habits.checkLoadError, /ذخیره شد/)

  listStatus = 200
  await habits.loadChecks()
  assert.equal(habits.checksReady, true)
  assert.equal(habits.checkLoadError, '')
  listStatus = 500
  await habits.toggleCheck(1)
  assert.equal(habits.isChecked(1), false)
  assert.match(habits.checkLoadError, /ذخیره شد/)
})

test('failed check POST leaves the previous checked state intact', async t => {
  const { habits } = setup(t, async (_url, { method }) => method === 'POST' ? respond(500) : respond(200, []))
  await habits.loadChecks()
  await assert.rejects(habits.toggleCheck(1))
  assert.equal(habits.isChecked(1), false)
  assert.equal(habits.checksReady, true)
  assert.equal(habits.checkLoadError, '')
})

test('protected 401 clears the session and supplies a login notice until successful login', async t => {
  const { auth, habits, saved } = setup(t, async url =>
    url === '/accounts/login' ? respond(200, { token: 'new-token' }) : respond(401))
  habits.habits = [{ id: 1 }]

  await habits.loadHabits()
  await nextTick()
  assert.equal(auth.isLoggedIn, false)
  assert.equal(saved.has('userToken'), false)
  assert.deepEqual(habits.habits, [])
  assert.match(auth.sessionNotice, /دوباره وارد شوید/)

  await auth.login({ username: 'demo', password: 'demo' })
  assert.equal(auth.isLoggedIn, true)
  assert.equal(auth.sessionNotice, '')
})

test('a late 401 from a past session cannot log out the current user', async t => {
  let release
  const { auth, habits, saved } = setup(t, async url => {
    if (url === '/accounts/logout') return respond(204)
    if (url === '/accounts/login') return respond(200, { token: 'new-token' })
    return new Promise(resolve => { release = resolve })
  })

  const staleRequest = habits.loadHabits()
  await auth.logout()
  await auth.login({ username: 'demo', password: 'demo' })
  release(respond(401))
  await staleRequest
  assert.equal(auth.isLoggedIn, true)
  assert.equal(saved.get('userToken'), 'new-token')
  assert.equal(auth.sessionNotice, '')
})
