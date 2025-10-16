/**
 * 下载 Pyodide 到本地
 * 使用方法: node scripts/download-pyodide.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');

const PYODIDE_VERSION = '0.24.1';
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full`;

// 需要下载的文件列表
const filesToDownload = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'pyodide-lock.json',
  'pyodide.asm.data',
  'repodata.json',
  'python_stdlib.zip',
  // 常用的包
  'packages/numpy/numpy-1.24.2-cp311-cp311-emscripten_3_1_45_wasm32.whl',
  'packages/matplotlib/matplotlib-3.5.2-cp311-cp311-emscripten_3_1_45_wasm32.whl',
  'packages/pandas/pandas-1.5.3-cp311-cp311-emscripten_3_1_45_wasm32.whl',
];

async function downloadFile(url, destPath) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    console.log(`下载: ${path.basename(destPath)}...`);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // 处理重定向
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✅ 完成: ${path.basename(destPath)}`);
            resolve();
          });
        }).on('error', reject);
      } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ 完成: ${path.basename(destPath)}`);
          resolve();
        });
      } else {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function downloadPyodide() {
  console.log(`开始下载 Pyodide v${PYODIDE_VERSION}...\n`);
  
  const pyodideDir = path.join(__dirname, '..', 'public', 'pyodide');
  
  // 创建目录
  if (!fs.existsSync(pyodideDir)) {
    fs.mkdirSync(pyodideDir, { recursive: true });
  }

  // 首先下载核心文件
  const coreFiles = [
    'pyodide.js',
    'pyodide.asm.js',
    'pyodide.asm.wasm',
    'pyodide-lock.json',
    'python_stdlib.zip'
  ];

  for (const file of coreFiles) {
    const url = `${PYODIDE_BASE_URL}/${file}`;
    const destPath = path.join(pyodideDir, file);
    
    try {
      await downloadFile(url, destPath);
    } catch (error) {
      console.error(`❌ 下载失败 ${file}:`, error.message);
      // 核心文件必须下载成功
      if (coreFiles.includes(file)) {
        throw error;
      }
    }
  }

  // 下载 repodata.json 以支持包管理
  try {
    const repoUrl = `${PYODIDE_BASE_URL}/repodata.json`;
    const repoPath = path.join(pyodideDir, 'repodata.json');
    await downloadFile(repoUrl, repoPath);
  } catch (error) {
    console.log('⚠️ repodata.json 下载失败，包管理功能可能受限');
  }

  // 创建一个简单的测试页面
  const testHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Pyodide Test</title>
</head>
<body>
    <h1>Pyodide Local Test</h1>
    <script src="pyodide.js"></script>
    <script>
        async function main() {
            let pyodide = await loadPyodide({
                indexURL: "."
            });
            console.log('Pyodide loaded successfully!');
            console.log(pyodide.runPython('import sys; sys.version'));
        }
        main();
    </script>
</body>
</html>`;

  fs.writeFileSync(path.join(pyodideDir, 'test.html'), testHtml);
  
  console.log('\n✅ Pyodide 下载完成！');
  console.log(`📁 文件保存在: ${pyodideDir}`);
  console.log('📝 您可以打开 test.html 测试本地 Pyodide 是否工作正常');
}

// 运行下载
downloadPyodide().catch(console.error);
