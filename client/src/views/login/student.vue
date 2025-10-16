<template>
  <div class="login-page">
    <el-card class="login-card">
      <h1 class="title">信息科技课堂</h1>
      <p class="subtitle">小组登录</p>
      
      <el-form @submit.prevent="onLogin" class="login-form">
        <div class="form-group">
          <label class="form-label">选择小组</label>
          <el-input
            v-model.number="groupId"
            placeholder="输入小组号"
            type="number"
            :min="1"
            :max="14"
            clearable
            size="large"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">选择角色</label>
          <el-radio-group v-model="role" size="large" class="role-group">
            <el-radio-button label="recorder">记录员</el-radio-button>
            <el-radio-button label="operator">操作员</el-radio-button>
          </el-radio-group>
        </div>
        
        <el-button
          type="primary"
          size="large"
          :disabled="!canSubmit"
          @click="onLogin"
          style="width: 100%; margin-top: 32px"
        >
          进入课堂
        </el-button>
        
        <el-alert
          v-if="err"
          :title="err"
          type="error"
          show-icon
          :closable="false"
          style="margin-top: 16px"
        />
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useSessionStore } from '@/stores/useSessionStore'
import { useRouter } from 'vue-router'

const store = useSessionStore()
const groupId = ref<number | null>(null)
const role = ref<'recorder' | 'operator'>('recorder')
const err = ref('')
const router = useRouter()

const canSubmit = computed(() => {
  return groupId.value && groupId.value >= 1 && groupId.value <= 14 && role.value
})

watch([groupId, role], () => { 
  err.value = '' 
})

onMounted(() => { 
  // 如果已经登录，根据角色跳转到相应页面
  if (store.isLoggedIn()) {
    const userRole = store.persisted.role || 'recorder'
    if (userRole === 'operator') {
      router.replace({ name: 'operator' })
    } else {
      router.replace({ name: store.persisted.currentTab })
    }
  }
})

function onLogin() {
  if (!groupId.value || !canSubmit.value) return
  
  try {
    store.login(groupId.value, role.value)
    // 根据角色跳转到不同页面
    if (role.value === 'operator') {
      router.replace({ name: 'operator' })
    } else {
      router.replace({ name: store.persisted.currentTab })
    }
  } catch (e: any) {
    err.value = String(e?.message || e)
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #d4e3f4 0%, #cdd9e8 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 480px;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
}

.login-card :deep(.el-card__body) {
  padding: 0;
}

.title {
  text-align: center;
  font-size: 32px;
  font-weight: 600;
  color: #2563eb;
  margin: 0 0 8px 0;
}

.subtitle {
  text-align: center;
  font-size: 18px;
  color: #6b7280;
  margin: 0 0 40px 0;
}

.login-form {
  width: 100%;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 16px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.login-form :deep(.el-input),
.login-form :deep(.el-select) {
  width: 100%;
}

.login-form :deep(.el-input__inner),
.login-form :deep(.el-select .el-input__inner) {
  height: 48px;
  font-size: 16px;
}

.login-form :deep(.el-button) {
  height: 48px;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.login-form :deep(.el-alert) {
  margin-top: 16px;
}

.role-group {
  width: 100%;
  display: flex;
}

.role-group :deep(.el-radio-button) {
  flex: 1;
}

.role-group :deep(.el-radio-button__inner) {
  width: 100%;
  font-size: 16px;
}
</style>