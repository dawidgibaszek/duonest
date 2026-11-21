<template>
  <div class="dn-field" :class="{ 'dn-field--disabled': disabled }">
    <label class="dn-field-box" :for="inputId">
      <span class="dn-field-main">
        <span class="dn-field-label-row">
          <span class="dn-field-label">{{ label }}</span>
          <span v-if="hint" class="dn-field-hint">{{ hint }}</span>
        </span>
        <input
          :id="inputId"
          ref="inputEl"
          v-model="model"
          :type="resolvedType"
          :disabled="disabled"
          class="dn-field-input"
          v-bind="$attrs"
        />
      </span>

      <button
        v-if="isPassword"
        type="button"
        class="dn-field-action"
        tabindex="-1"
        :aria-label="revealed ? 'Ukryj hasło' : 'Pokaż hasło'"
        @click="revealed = !revealed"
      >
        <ion-icon :icon="revealed ? eyeOffOutline : eyeOutline" />
      </button>
      <button
        v-else-if="clearable && model && !disabled"
        type="button"
        class="dn-field-action"
        tabindex="-1"
        aria-label="Wyczyść"
        @click="clear"
      >
        <ion-icon :icon="closeCircleOutline" />
      </button>

      <slot name="trailing" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useId } from 'vue'
import { eyeOutline, eyeOffOutline, closeCircleOutline } from 'ionicons/icons'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  label: string
  hint?: string
  type?: string
  clearable?: boolean
  disabled?: boolean
  id?: string
}>(), {
  type: 'text',
  clearable: true,
  disabled: false
})

const [model, modifiers] = defineModel<string>({
  default: '',
  set(value) {
    return modifiers.trim && typeof value === 'string' ? value.trim() : value
  }
})

const generatedId = useId()
const inputId = computed(() => props.id || `dn-field-${generatedId}`)
const inputEl = ref<HTMLInputElement | null>(null)
const revealed = ref(false)

const isPassword = computed(() => props.type === 'password')
const resolvedType = computed(() => (isPassword.value && revealed.value ? 'text' : props.type))

const clear = () => {
  model.value = ''
  inputEl.value?.focus()
}
</script>

<style scoped>
.dn-field-box {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 64px;
  padding: 10px 10px 10px 18px;
  background: var(--dn-auth-field);
  border: 1px solid var(--dn-auth-field-line);
  border-radius: 14px;
  cursor: text;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.dn-field-box:focus-within {
  border-color: var(--dn-auth-ink);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(28, 27, 25, 0.06);
}

.dn-field--disabled .dn-field-box {
  opacity: 0.6;
  cursor: not-allowed;
}

.dn-field-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dn-field-label-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.dn-field-label {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--dn-auth-muted);
}

.dn-field-hint {
  font-size: 12px;
  line-height: 1.3;
  color: var(--dn-auth-faint);
}

.dn-field-hint::before {
  content: '·';
  margin-right: 8px;
}

.dn-field-input {
  width: 100%;
  height: 24px;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  color: var(--dn-auth-ink);
  user-select: text;
  -webkit-user-select: text;
}

.dn-field-input::placeholder {
  color: var(--dn-auth-faint);
  font-weight: 400;
}

.dn-field-action {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #b4b8c0;
  font-size: 24px;
  cursor: pointer;
  transition: color 0.15s ease;
}

.dn-field-action:active {
  color: var(--dn-auth-ink);
}
</style>
