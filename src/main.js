import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'

import VueCodemirror from 'vue-codemirror'
import VueClipboard from 'vue-clipboard2'

import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/keymap/sublime.js'
import 'codemirror/addon/selection/active-line.js'

import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/dracula.css'

Vue.use(VueCodemirror)
Vue.use(VueClipboard)

Vue.config.productionTip = false

new Vue({
  render: h => h(App)
}).$mount('#app')
