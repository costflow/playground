<template>
  <div id="app" class="playground">
    <h2 class="title">Costflow Playground</h2>
    <p class="version">
      <a href="https://docs.costflow.io/syntax/">Syntax v1.0</a> /
      <a href="https://github.com/costflow/parser">Parser v1.1.2</a>
    </p>
    <nav>
      <a class="nav-item" href="https://docs.costflow.io/" target="_blank"
        >Docs</a
      >
      <a class="nav-item" href="https://github.com/costflow" target="_blank"
        >Github</a
      >
      <a class="nav-item" href="https://hub.costflow.io/" target="_blank"
        >Self-Hosted Costflow Hub</a
      >
    </nav>
    <div class="input">
      <input
        type="text"
        :value="input"
        @input="update"
        placeholder="Input your message"
        :class="{ full: !showShuffle }"
      />
      <span
        class="icon shuffle"
        @click="randomExample"
        title="Run a random example"
        v-if="showShuffle"
      >
        <svg
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          width="24px"
          height="24px"
          viewBox="0 0 24 24"
          aria-labelledby="shuffleIconTitle"
          stroke="#2329D6"
          stroke-width="1"
          stroke-linecap="square"
          stroke-linejoin="miter"
          fill="none"
          color="#2329D6"
        >
          <title id="shuffleIconTitle">Run a random example</title>
          <path
            d="M21 16.0399H17.7707C15.8164 16.0399 13.9845 14.9697 12.8611 13.1716L10.7973 9.86831C9.67384 8.07022 7.84196 7 5.88762 7L3 7"
          />
          <path
            d="M21 7H17.7707C15.8164 7 13.9845 8.18388 12.8611 10.1729L10.7973 13.8271C9.67384 15.8161 7.84196 17 5.88762 17L3 17"
          />
          <path d="M19 4L22 7L19 10" />
          <path d="M19 13L22 16L19 19" />
        </svg>
      </span>
    </div>
    <div class="code-editor output">
      <codemirror v-model="output" :options="outputOptions"></codemirror>
      <div
        class="icon copy"
        v-clipboard:copy="output"
        v-clipboard:success="onCopy"
        v-clipboard:error="onCopyError"
        v-if="input"
      >
        <span>Copy to clipboard</span>
      </div>
    </div>
    <button @click="toggleConfig" v-if="!showConfig">Show Config</button>
    <button @click="toggleConfig" v-else>Hide Config</button>
    <div class="code-editor config" v-if="showConfig">
      <codemirror
        class="code-editor"
        v-model="config"
        :options="configOptions"
      ></codemirror>
      <p class="tips">
        * If you change the default config, the examples will be unavailable in
        this browser. You can get them back by opening an incognito window.
      </p>
      <button @click="saveConfig">Save Config</button>
    </div>
  </div>
</template>

<script>
import costflow from 'costflow'
import { debounce } from 'debounce'

const OUTPUT_PLACEHOLDER = '// Output will be here'
const DEFAULT_CONFIG = {
  mode: 'beancount',
  currency: 'USD',
  timezone: 'America/Los_Angeles',
  tag: '#costflow',
  account: {
    eob: 'Equity:Opening-Balances',
    bofa: 'Assets:US:BofA:Checking',
    rx: 'Assets:Receivables:X',
    ry: 'Assets:Receivables:Y',
    boc: 'Assets:CN:BOC',
    cloud: 'Expenses:Cloud',
    cmb: 'Liabilities:CreditCard:CMB',
    food: 'Expenses:Food',
    phone: 'Expenses:Home:Phone',
    rent: 'Expenses:Home:Rent',
    subscription: 'Expenses:Subscriptions',
    visa: 'Liabilities:CreditCard:Visa'
  },
  formula: {
    '☕️':
      '@Leplays ☕️ {{ amount }} Liabilities:CreditCard:Visa > Expenses:Coffee',
    c2f: '{{ pre }} cmb > food',
    gcp: '@Google {{ amount }} USD visa > cloud',
    spotify: '@Spotify 15.98 USD visa > subscription'
  },
  defaultAccount: 'Assets:US:BofA:Checking',
  alphavantage: null,
  indent: 2,
  lineLength: 50
}
var examples = [
  '@Verizon 59.61 Assets:US:BofA:Checking > Expenses:Home:Phone',
  '@Verizon 59.61 bofa > phone',
  '2019-01-01 Rent 750 cmb + 750 boc > rent',
  'Dinner 180 CNY bofa > rx + ry + food',
  'Dinner pay with default account 180 CNY > rx + ry + food',
  'Transfer to account in US 5000 CNY @@ 726.81 USD boc > 726.81 bofa',
  '@Verizon Assets:US:BofA:Checking -59.61 | Expenses:Home:Phone 59.61',
  '@Verizon bofa -59.61 | phone 59.61',
  '2019-01-01 Rent cmb -750 | boc -750 | rent 1500',
  'Dinner bofa 180 CNY | rx -60 | ry -60 | food -60',
  'f spotify',
  'gcp 12.50',
  'f c2f @KFC 36',
  '☕️ 4.2',
  // 'Transfer to account in US | boc -5000 CNY @@ 726.81 USD  | bofa +726.81',
  'note bofa Called about fraudulent card.',
  'balance bofa 360',
  'event location Paris, France'
]
var config =
  localStorage.getItem('costflow') || JSON.stringify(DEFAULT_CONFIG, null, 4)

export default {
  name: 'app',
  components: {},
  data () {
    return {
      input: '',
      output: OUTPUT_PLACEHOLDER,
      showConfig: false,
      config,
      configOptions: {
        indentUnit: 4,
        tabSize: 4,
        mode: 'application/json',
        keyMap: 'sublime',
        theme: 'dracula',
        autofocus: false,
        styleActiveLine: true,
        lineNumbers: true,
        line: true
      },
      outputOptions: {
        indentUnit: 4,
        tabSize: 4,
        mode: 'text/javascript',
        keyMap: 'sublime',
        theme: 'dracula',
        autofocus: false,
        styleActiveLine: true,
        lineNumbers: true,
        line: true
      }
    }
  },
  computed: {
    showShuffle () {
      const defaultReplacement = JSON.stringify(
        DEFAULT_CONFIG.replacement,
        null,
        4
      )
      const currentConfig = JSON.parse(config)
      const currentReplacement = JSON.stringify(
        currentConfig.replacement,
        null,
        4
      )
      return defaultReplacement === currentReplacement
    }
  },
  watch: {
    async input () {
      if (!this.input) {
        this.output = OUTPUT_PLACEHOLDER
        return
      }
      try {
        const result = await costflow.parse(this.input, JSON.parse(config))
        if (result) {
          this.output = result.output
        }
      } catch (error) {
        console.log(error)
      }
    }
  },
  methods: {
    update: debounce(function (e) {
      this.input = e.target.value
    }, 300),
    randomExample () {
      let isSame = true
      let newInput
      while (isSame) {
        const random = Math.floor(
          Math.random() * Math.floor(examples.length - 1)
        )
        newInput = examples[random]
        if (this.input !== newInput) {
          isSame = false
        }
      }

      this.input = newInput
    },
    onCopy () {},
    onCopyError (e) {
      console.log(e)
    },
    toggleConfig () {
      this.showConfig = !this.showConfig
    },
    saveConfig () {
      try {
        config = JSON.parse(this.config, null, 4)
      } catch (err) {
        console.log(err)
        alert('Invalid JSON')
      }
      localStorage.setItem('config', JSON.stringify(config, null, 4))
    }
  }
}
</script>

<style>
#app {
  font-family: Courier, Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
.playground {
  text-align: center;
  width: 90%;
  max-width: 600px;
  margin: 0 auto;
  box-sizing: border-box;
}
.playground .icon svg {
  max-width: 24px;
  max-height: 24px;
}
.playground .title {
  font-size: 32px;
}
.playground .version {
  font-size: 13px;
  color: #666;
  margin: 0 0 30px;
}
.playground .version a {
  color: #666;
  text-decoration: none;
}
.playground nav .nav-item {
  margin: 0 12px;
}

/* Input */
.playground .input {
  width: 100%;
  margin: 40px 0 20px;
  box-sizing: border-box;
  border: 1px solid #2329d6;
  overflow: hidden;
}
.playground .input input {
  display: block;
  width: calc(100% - 48px);
  line-height: 48px;
  padding: 0 6px;
  box-sizing: border-box;
  border: none;
  float: left;
  outline: none;
  font-family: "Fira Code", Menlo, Monaco, monospace;
  font-size: 13px;
}
.playground .input input.full {
  width: 100%;
}
.playground .input .shuffle {
  background-color: #fff;
  width: 48px;
  height: 48px;
  float: right;
  display: flex;
  align-items: center;
  justify-content: center;
}
.playground .input .shuffle:hover {
  background-color: #f1f1f1;
}

/* Code Editor */
.playground .code-editor {
  margin: 20px 0;
  position: relative;
}
.playground .code-editor .CodeMirror {
  text-align: left;
  font-size: 14px;
  font-family: "Fira Code", Menlo, Monaco, monospace;
  line-height: 24px;
  padding: 20px 20px 20px 0;
  box-shadow: rgba(0, 0, 0, 0.55) 0px 5px 16px;
  border-radius: 5px;
  height: auto;
  min-height: 200px;
}
.playground .code-editor .copy {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
  bottom: 0;
  left: 0;
  font-size: 12px;
  width: 100%;
  line-height: 32px;
  border: none;
  padding: 0;
  z-index: 999;
}
.playground .code-editor .copy:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
.playground .code-editor .copy:active {
  background-color: rgba(255, 255, 255, 0.3);
}
.playground .code-editor .tips {
  color: #333;
  font-size: 12px;
}
</style>
