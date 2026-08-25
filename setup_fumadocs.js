const { spawn } = require('child_process');

const p = spawn('npx', [
  'create-fumadocs-app@latest',
  'acju-prayer-times-docs-new',
  '--template', '+next+fuma-docs-mdx',
  '--install',
  '--pm', 'npm',
  '--no-git'
], {
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

const interval = setInterval(() => {
  p.stdin.write('\r\n');
}, 1500);

p.on('close', (code) => {
  clearInterval(interval);
  console.log(`Child process exited with code ${code}`);
});
