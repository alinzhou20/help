<template>
  <div class="login-page">
    <el-card class="login-card">
      <h1 class="title">信息科技课堂</h1>
      <p class="subtitle">教师登录</p>
      
      <el-form @submit.prevent="onLogin" class="login-form">
        <div class="form-group">
          <label class="form-label">登录密码</label>
          <el-input
            v-model="pwd"
            type="password"
            placeholder="请输入密码"
            show-password
            size="large"
            clearable
            @keyup.enter="onLogin"
          />
        </div>
        
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          @click="onLogin"
          style="width: 100%; margin-top: 32px"
        >
          进入管理端
        </el-button>
        
        <p class="hint">教师端为唯一登录。如在其他窗口已登录，请先退出。</p>
        
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTeacherStore } from '@/stores/useTeacherStore'

const store = useTeacherStore()
const router = useRouter()
const pwd = ref('')
const loading = ref(false)
const err = ref('')

onMounted(() => { 
  store.refreshLocks()
  store.autoRelogin()
  if (store.isLoggedIn()) {
    router.replace({ name: 'teacher-demo' })
  }
})

async function onLogin() {
  if (!pwd.value) {
    err.value = '请输入密码'
    return
  }
  
  try {
    loading.value = true
    err.value = ''
    store.login(pwd.value)
    router.replace({ name: 'teacher-demo' })
  } catch (e: any) {
    err.value = String(e?.message || e)
  } finally {
    loading.value = false
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

.login-form :deep(.el-input) {
  width: 100%;
}

.login-form :deep(.el-input__inner) {
  height: 48px;
  font-size: 16px;
}

.login-form :deep(.el-button) {
  height: 48px;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.hint {
  margin-top: 16px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
}

.login-form :deep(.el-alert) {
  margin-top: 16px;
}
</style>