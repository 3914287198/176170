@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

:: ==============================================
:: GitHub 一键提交脚本（修复版）
:: 新增：检测revert状态、空提交处理、命令输入容错
:: ==============================================

:: 检查Git是否安装
where git >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Git，请先安装并配置环境变量
    pause
    exit /b 1
)

:: 检查是否为Git仓库
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [错误] 当前目录不是Git仓库
    pause
    exit /b 1
)

:: 检测是否有未完成的revert操作
git status | findstr /i "Revert currently in progress" >nul 2>&1
if not errorlevel 1 (
    echo [警告] 检测到未完成的Git revert操作！
    echo 请先处理以下选项：
    echo 1. 继续revert：git revert --continue
    echo 2. 跳过revert：git revert --skip
    echo 3. 终止revert：git revert --abort
    echo.
    set /p "revert_choice=请选择操作（输入1/2/3，回车执行）："
    if "!revert_choice!"=="1" git revert --continue
    if "!revert_choice!"=="2" git revert --skip
    if "!revert_choice!"=="3" git revert --abort
    :: 处理完revert后，重新检查工作区
    git status --porcelain >nul 2>&1
    if errorlevel 1 (
        echo [提示] 工作区无修改，无需提交
        pause
        exit /b 0
    )
)

:: 设置默认提交信息
set "commit_msg=1"
if not "%~1"=="" set "commit_msg=%~1"

:: 远程仓库和分支配置
set "remote=origin"
set "branch=main"

:: -------------- 执行Git操作 --------------
echo.
echo ==============================================
echo 开始执行GitHub提交操作
echo 提交信息：!commit_msg!
echo 远程仓库：!remote!
echo 目标分支：!branch!
echo ==============================================
echo.

:: 1. 添加所有修改
echo [1/3] 执行 git add .
git add .
if errorlevel 1 (
    echo [错误] git add 操作失败
    pause
    exit /b 1
)
echo [成功] 文件添加完成

:: 2. 检查是否有内容需要提交（避免空提交）
git status --porcelain | findstr . >nul 2>&1
if errorlevel 1 (
    echo [提示] 工作区无修改，无需commit
    echo 跳过commit步骤，直接尝试push（同步分支）
    goto push_step
)

:: 3. 执行commit
echo.
echo [2/3] 执行 git commit -m "!commit_msg!"
git commit -m "!commit_msg!"
if errorlevel 1 (
    echo [错误] git commit 操作失败
    pause
    exit /b 1
)
echo [成功] 提交完成

:: 4. 执行push
:push_step
echo.
echo [3/3] 执行 git push !remote! !branch!
git push !remote! !branch!
if errorlevel 1 (
    echo [错误] git push 操作失败
    echo 常见原因：
    echo 1. 远程分支名称错误（当前：!branch!）
    echo 2. 本地分支落后，需先执行：git pull !remote! !branch!
    echo 3. 无推送权限/网络问题
    pause
    exit /b 1
)
echo [成功] 推送完成

:: 操作完成
echo.
echo ==============================================
echo ✅ 所有操作执行完成！
echo ==============================================
echo.
pause
endlocal