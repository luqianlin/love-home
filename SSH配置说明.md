# GitHub Actions部署配置说明

为了确保GitHub Actions能够成功部署到腾讯云服务器，需要在GitHub仓库中添加正确的密钥设置。

## 配置GitHub Secrets

1. 在GitHub仓库页面，点击 "Settings" 选项卡
2. 在左侧菜单中选择 "Secrets and variables" > "Actions"
3. 点击 "New repository secret" 按钮
4. 添加以下密钥:

   **TENCENT_SSH_PASSWORD**
   - 名称: `TENCENT_SSH_PASSWORD`
   - 值: `lql@123lql` (腾讯云服务器的root密码)

## 使用SSH密钥方式（更安全的替代方案）

如果您想使用SSH密钥而不是密码进行部署（推荐用于生产环境），请按照以下步骤操作:

1. **在本地生成SSH密钥对**:

   ```bash
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com" -f tencent_deploy_key
   ```

   这将生成两个文件:
   - `tencent_deploy_key` (私钥)
   - `tencent_deploy_key.pub` (公钥)

2. **将公钥添加到腾讯云服务器**:

   ```bash
   # 复制公钥内容
   cat tencent_deploy_key.pub
   
   # 登录到腾讯云服务器
   ssh root@49.235.80.118
   
   # 在服务器上添加公钥到authorized_keys
   mkdir -p ~/.ssh
   echo "复制的公钥内容" >> ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

3. **将私钥添加到GitHub Secrets**:

   - 在GitHub仓库的Secrets页面，添加新的密钥:
     - 名称: `TENCENT_SSH_KEY`
     - 值: 私钥文件`tencent_deploy_key`的全部内容

4. **修改GitHub Actions工作流文件**:

   编辑 `.github/workflows/deploy.yml` 文件:

   ```yaml
   - name: 部署到腾讯云服务器
     uses: appleboy/ssh-action@master
     with:
       host: 49.235.80.118
       username: root
       key: ${{ secrets.TENCENT_SSH_KEY }}
       script: |
         # 脚本内容...
   ```

   只需将 `password: ${{ secrets.TENCENT_SSH_PASSWORD }}` 替换为 `key: ${{ secrets.TENCENT_SSH_KEY }}`

## 安全注意事项

- 请勿在公开的代码仓库中直接硬编码密码或私钥
- 定期轮换密码和密钥
- 为部署专门创建一个有限权限的用户，而不是使用root用户
- 考虑使用防火墙限制SSH访问来源 