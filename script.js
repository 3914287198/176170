// 全局变量
let files = [];
let comments = [];
let expandedFolderIndices = []; // 改为数组，记录所有展开的文件夹索引
let currentPage = 1; // 当前页码
let totalPages = 1; // 总页数
let totalComments = 0; // 总留言数
let filteredFiles = []; // 用于存储过滤后的文件列表
let commentsCache = new Map(); // 留言缓存
let isCommentsLoading = false; // 留言是否正在加载
let commentsLoadStartTime = 0; // 留言加载开始时间
let pendingComments = []; // 用于存储用户刚提交但还未在列表中显示的留言
let currentSource = 'lanzou';
const sourceMap = {
    'lanzou': './data/database.json',
     'lanzouyx': './data/lanzouyx.json',
    'haiwai': './data/haiwai.json',
    'baidu': './data/baidu.json',
    'gongyi': './data/gongyi.json'
};

// 从database.json获取文件列表
async function fetchFiles() {
    try {
        // 从DATA目录下的database.json获取文件列表
        
        const response = await fetch(sourceMap[currentSource]);
        
        
        if (response.ok) {
            const rawData = await response.json();
            
            
            // 从json数据中提取files
            if (rawData.files && rawData.files.length > 0 && rawData.files[0].data) {
                files = rawData.files[0].data;
                
            } else {
                
                files = [];
            }
            filteredFiles = [...files]; // 初始化过滤后的文件列表
        } else {
            
            // 如果获取失败，使用默认数据
            useDefaultFiles();
        }
        
        renderFileList();
    } catch (error) {
        
        // 使用默认数据
        useDefaultFiles();
        renderFileList();
    }
}

// 使用默认文件数据（仅在获取database.json失败时使用）
function useDefaultFiles() {
    // 从database.json获取失败时，使用一些示例数据
    files = [
        {
            name: '示例文件夹',
            type: 'folder',
            url: '#',
            note: '这是一个示例文件夹',
            children: [
                { name: '示例文件.txt', type: 'file', url: '#', createdAt: '2024-01-01' }
            ],
            expanded: false
        }
    ];
    filteredFiles = [...files]; // 初始化过滤后的文件列表
}

function renderFileList() {
    const fileList = document.getElementById('fileList');
    const noFiles = document.getElementById('noFiles');
    
    if (!fileList) {
        return;
    }
    
    fileList.innerHTML = '';
    
    // 创建预览模态框（如果还不存在）
    if (!document.getElementById('filePreviewModal')) {
        const modalHTML = `
            <div class="modal fade" id="filePreviewModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="filePreviewModalLabel">文件预览</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="textPreviewContent" style="max-height: 70vh; overflow-y: auto; white-space: pre-wrap; font-family: monospace;"></div>
                            <img id="imagePreviewContent" src="" alt="预览图片" class="img-fluid" style="max-height: 70vh; display: none;">
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            <a id="downloadFileBtn" href="#" class="btn btn-primary" download>下载文件</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    function renderItem(item, index, isChild = false) {
        const li = document.createElement('li');
        
        // 根据文件类型添加不同的CSS类
        if (item.type === 'folder') {
            li.className = 'list-group-item folder-item';
        } else if (item.type === 'file') {
            li.className = 'list-group-item file-item';
        } else if (item.type === 'divider') {
            // 处理分割线类型
            li.className = 'list-group-item py-1';
            
            // 构建分割线显示内容，不显示创建时间
            let dividerContent = '<div class="divider-line">' + (item.name || '=================') + '</div>';
            
            li.innerHTML = dividerContent;
            fileList.appendChild(li);
            return li;
        } else {
            li.className = 'list-group-item';
        }
        
        const a = document.createElement('a');
        a.href = item.url || '#';
        a.className = 'file-name';
        // 对于图片和文本文件，不使用新窗口打开，而是显示预览
        const isImage = item.type === 'file' && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(item.name);
        const isText = item.type === 'file' && /\.(txt|log|md|csv)$/i.test(item.name);
        if (!isImage && !isText) {
            a.target = '_blank';  // 非图片和非文本文件在新窗口打开
        }
        
        // 根据文件类型设置图标
        let iconClass = '';
        if (item.type === 'folder') {
            iconClass = 'bi-folder2-open folder-icon';
        } else {
            // 根据文件扩展名设置不同的图标
            const extension = item.name.split('.').pop().toLowerCase();
            switch(extension) {
                case 'txt':
                case 'log':
                case 'md':
                case 'csv':
                    iconClass = 'bi-file-text';
                    break;
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                case 'bmp':
                case 'webp':
                    iconClass = 'bi-file-image';
                    break;
                case 'pdf':
                    iconClass = 'bi-file-pdf';
                    break;
                case 'doc':
                case 'docx':
                    iconClass = 'bi-file-word';
                    break;
                case 'xls':
                case 'xlsx':
                    iconClass = 'bi-file-excel';
                    break;
                case 'ppt':
                case 'pptx':
                    iconClass = 'bi-file-ppt';
                    break;
                case 'zip':
                case 'rar':
                case '7z':
                case 'tar':
                case 'gz':
                    iconClass = 'bi-file-zip';
                    break;
                case 'mp3':
                case 'wav':
                case 'ogg':
                case 'flac':
                    iconClass = 'bi-file-music';
                    break;
                case 'mp4':
                case 'avi':
                case 'mkv':
                case 'mov':
                case 'wmv':
                    iconClass = 'bi-file-play';
                    break;
                default:
                    iconClass = 'bi-file-earmark';
            }
        }
        
        // 构建显示内容
        let displayContent = '';
        
        // 检查是否是24小时内新增的文件或文件夹
        let isNewItem = false;
        if (item.type === 'file') {
            // 对于文件，检查 date 或 createdAt 字段
            const itemDate = item.date || item.createdAt;
            if (itemDate) {
                // 解析日期字符串
                let dateObj;
                if (itemDate.includes('T')) {
                    // ISO格式日期
                    dateObj = new Date(itemDate);
                } else if (itemDate.includes(' ')) {
                    // YYYY-MM-DD HH:MM格式
                    const [datePart, timePart] = itemDate.split(' ');
                    const [year, month, day] = datePart.split('-');
                    const [hours, minutes] = timePart.split(':');
                    dateObj = new Date(year, month - 1, day, hours, minutes);
                } else {
                    // 只有日期
                    dateObj = new Date(itemDate);
                }
                
                // 检查是否在24小时内
                const now = new Date();
                const diffHours = (now - dateObj) / (1000 * 60 * 60);
                isNewItem = diffHours <= 24;
            }
        } else {
            // 对于文件夹，我们可以通过检查子文件来确定是否是新文件夹
            // 如果文件夹有子文件，且其中有24小时内新增的文件，则认为文件夹是新的
            if (item.children && item.children.length > 0) {
                // 检查子文件中是否有24小时内新增的
                isNewItem = item.children.some(child => {
                    const childDate = child.date || child.createdAt;
                    if (childDate) {
                        // 解析日期字符串
                        let dateObj;
                        if (childDate.includes('T')) {
                            // ISO格式日期
                            dateObj = new Date(childDate);
                        } else if (childDate.includes(' ')) {
                            // YYYY-MM-DD HH:MM格式
                            const [datePart, timePart] = childDate.split(' ');
                            const [year, month, day] = datePart.split('-');
                            const [hours, minutes] = timePart.split(':');
                            dateObj = new Date(year, month - 1, day, hours, minutes);
                        } else {
                            // 只有日期
                            dateObj = new Date(childDate);
                        }
                        
                        // 检查是否在24小时内
                        const now = new Date();
                        const diffHours = (now - dateObj) / (1000 * 60 * 60);
                        return diffHours <= 24;
                    }
                    return false;
                });
            }
        }
        
        if (item.type === 'folder') {
            // 文件夹保持原来的图标
            const displayName = item._highlightedName || item.name;
            displayContent = `<i class="bi ${iconClass}"></i> ${displayName}`;
        } else {
            // 文件使用特定图标
            const displayName = item._highlightedName || item.name;
            
            // 检查URL是否以特定参数结尾
            let iconSrc = "img/tu.png"; // 默认图标
            
            // 从URL中提取文件名部分
            let fileName = item.url;
            if (item.url && item.url.includes('/')) {
                // 如果是URL，获取最后一部分
                fileName = item.url.split('/').pop() || item.url;
            }
            
            // 检查URL是否以特定参数结尾
            if (fileName && fileName.includes('.jpg')) {
                iconSrc = "img/jpg.png";
            } else if (fileName && fileName.includes('.gif')) {
                iconSrc = "img/gif.png";
            } else if (fileName && fileName.includes('.txt')) {
                iconSrc = "img/txt.png";
            }else if (fileName && fileName.includes('.png')) {
                iconSrc = "img/png.png";
            }
            
            displayContent = `<img src="${iconSrc}" alt="文件图标" style="width: 16px; height: 16px; margin-right: 5px; vertical-align: middle;"> ${displayName}`;
        }
        
        // 如果有备注，添加备注
        if (item.note) {
            displayContent += ` <span class="file-note">${item.note}</span>`;
        }
        
        // 只有文件才显示创建时间（分割线不显示时间）
        if (item.type === 'file') {
            // 检查 date 或 createdAt 字段
            let displayDate = item.date || item.createdAt;
            // 如果没有日期或日期格式不正确，使用当前日期
            if (!displayDate) {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                displayDate = `${year}-${month}-${day} ${hours}:${minutes}`;
            }
            displayContent += ` <span class="file-date">${displayDate}</span>`;
        }
        
        a.innerHTML = displayContent;
        
        // 设置新项目样式
        if (isNewItem) {
            a.classList.add('new-item');
        } else {
            a.classList.remove('new-item');
        }
        
        // 为图片和文本文件添加预览功能
        if (isImage || isText) {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                showFilePreview(item.url, item.name, isImage);
            });
        } else if (item.type === 'folder') {
            a.href += '/';
            a.addEventListener('click', (e) => {
                e.preventDefault();
                // 修改为：允许多个文件夹同时展开，只在点击已展开的文件夹时关闭它
                const indexInArray = expandedFolderIndices.indexOf(index);
                if (indexInArray !== -1) {
                    // 点击已展开的文件夹，从数组中移除（关闭它）
                    expandedFolderIndices.splice(indexInArray, 1);
                } else {
                    // 点击未展开的文件夹，添加到数组中（展开它）
                    expandedFolderIndices.push(index);
                }
                renderFileList();
                
                // 将被点击的文件夹滚动到视图顶部
                setTimeout(() => {
                    li.scrollIntoView({block: 'start', behavior: 'smooth'});
                }, 100);
            });
        }
        li.appendChild(a);
        fileList.appendChild(li);

        // 检查是否有需要展开的文件夹（从后台添加文件后设置的）
        if (window.expandedFolderIndex !== undefined && window.expandedFolderIndex === index) {
            expandedFolderIndex = window.expandedFolderIndex;
            delete window.expandedFolderIndex; // 清除标记
        }

        // 只有当前文件夹是展开状态时才显示子文件
        // 在搜索模式下，如果文件夹被标记为expanded，则展开它
        const shouldExpand = item.type === 'folder' && 
                            ((expandedFolderIndices.includes(index)) || 
                             (item.expanded === true));
                             
        if (shouldExpand && item.children) {
            // 确保 children 是数组
            const childrenArray = Array.isArray(item.children) ? item.children : [];
            if (childrenArray.length > 0) {
                const ul = document.createElement('ul');
                ul.className = 'ms-2 mt-1';
                childrenArray.forEach((child, childIndex) => {
                    const childLi = renderItem(child, childIndex, true);
                    ul.appendChild(childLi);
                });
                li.appendChild(ul);
            }
        }
        return li;
    }

    // 确保 filteredFiles 是数组
    if (Array.isArray(filteredFiles)) {
        if (filteredFiles.length === 0) {
            fileList.classList.add('d-none');
            noFiles.classList.remove('d-none');
        } else {
            fileList.classList.remove('d-none');
            noFiles.classList.add('d-none');
            filteredFiles.forEach((item, index) => renderItem(item, index));
        }
    } else {
        // 如果不是数组，设置为空数组
        filteredFiles = [];
        fileList.classList.add('d-none');
        noFiles.classList.remove('d-none');
    }
}

// 显示文件预览
function showFilePreview(fileUrl, fileName, isImage) {
    const modal = new bootstrap.Modal(document.getElementById('filePreviewModal'));
    const textPreviewContent = document.getElementById('textPreviewContent');
    const imagePreviewContent = document.getElementById('imagePreviewContent');
    const downloadBtn = document.getElementById('downloadFileBtn');
    const modalTitle = document.getElementById('filePreviewModalLabel');
    
    // 设置下载链接
    downloadBtn.href = fileUrl;
    downloadBtn.download = fileName;
    modalTitle.textContent = fileName;
    
    if (isImage) {
        // 显示图片预览
        textPreviewContent.style.display = 'none';
        imagePreviewContent.style.display = 'block';
        imagePreviewContent.src = fileUrl;
        imagePreviewContent.alt = fileName;
    } else {
        // 显示文本内容
        textPreviewContent.style.display = 'block';
        imagePreviewContent.style.display = 'none';
        textPreviewContent.textContent = '加载中...';
        
        // 获取文本文件内容
        fetch(fileUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                return response.text();
            })
            .then(text => {
                textPreviewContent.textContent = text;
            })
            .catch(error => {
                textPreviewContent.textContent = '无法加载文件内容: ' + error.message;
            });
    }
    
    // 显示模态框
    modal.show();
}

// 高亮显示搜索关键词
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// 搜索文件功能
function searchFiles() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        // 如果搜索框为空，显示所有文件
        filteredFiles = [...files];
    } else {
        // 过滤文件，只显示匹配的文件和文件夹
        filteredFiles = [];
        
        function filterItems(items) {
            const filteredItems = [];
            
            items.forEach(item => {
                // 检查当前项是否匹配搜索词
                if (item.name.toLowerCase().includes(searchTerm)) {
                    // 创建一个带有高亮名称的新对象
                    const filteredItem = {
                        ...item,
                        _highlightedName: highlightSearchTerm(item.name, searchTerm)
                    };
                    
                    // 如果是文件夹，过滤其子项
                    if (item.type === 'folder' && item.children && item.children.length > 0) {
                        const filteredChildren = filterItems(item.children);
                        filteredItem.children = filteredChildren;
                        // 如果有匹配的子项，标记文件夹为展开状态
                        if (filteredChildren.length > 0) {
                            filteredItem.expanded = true;
                        }
                    }
                    
                    filteredItems.push(filteredItem);
                } else if (item.type === 'folder' && item.children && item.children.length > 0) {
                    // 如果当前文件夹名称不匹配，但其子项可能匹配
                    const filteredChildren = filterItems(item.children);
                    if (filteredChildren.length > 0) {
                        // 只有当有匹配的子项时才包含此文件夹
                        const filteredItem = {
                            ...item,
                            _highlightedName: highlightSearchTerm(item.name, searchTerm),
                            children: filteredChildren,
                            expanded: true // 自动展开包含匹配子项的文件夹
                        };
                        filteredItems.push(filteredItem);
                    }
                }
            });
            
            return filteredItems;
        }
        
        filteredFiles = filterItems(files);
    }
    
    // 重置展开状态
    expandedFolderIndices = []; // 改为清空数组
    
    // 重新渲染文件列表
    renderFileList();
}

// 添加搜索事件监听器
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    // 下载线路切换
    const sourceButtons = document.querySelectorAll('#source-switcher button');
    
    // 从 localStorage 读取上次选择的线路，如果没有则默认为 'lanzou'
    const savedSource = localStorage.getItem('preferredSource');
    if (savedSource && sourceMap[savedSource]) {
        currentSource = savedSource;
    }
    
    // 初始化按钮状态
    sourceButtons.forEach(btn => {
        if (btn.getAttribute('data-source') === currentSource) {
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary');
        } else {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline-primary');
        }
        
        btn.addEventListener('click', function() {
            const source = this.getAttribute('data-source');
            if (source === currentSource) return;
            
            // 更新当前源
            currentSource = source;
            // 保存用户的选择到 localStorage
            localStorage.setItem('preferredSource', currentSource);
            
            // 更新按钮状态
            sourceButtons.forEach(b => {
                if (b.getAttribute('data-source') === currentSource) {
                    b.classList.remove('btn-outline-primary');
                    b.classList.add('btn-primary');
                } else {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-outline-primary');
                }
            });
            
            // 重新加载文件
            // 清空当前文件列表显示，显示加载中（可选）
            const fileList = document.getElementById('fileList');
            if (fileList) {
                fileList.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div><p class="mt-2 text-muted">正在切换线路...</p></div>';
            }
            fetchFiles();
        });
    });
    
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', searchFiles);
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                searchFiles();
            }
        });
        
        // 实时搜索（可选）
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchFiles, 300); // 300ms延迟
        });
    }
    
    // 定期刷新文件列表以确保同步
    setInterval(fetchFiles, 120000); // 每120秒刷新一次
    
    // 初始化加载：先加载文件列表，然后再加载留言信息
    async function initializePage() {
        // 1. 先加载文件列表
        await fetchFiles();
        
        
        // 2. 文件列表加载完成后，再加载留言信息
        await fetchComments(1);
        
    }
    
    // 执行初始化
    initializePage();
});

// 从database.json获取留言列表
async function fetchComments(page = 1) {
    // 检查是否使用 Cloudflare D1
    const useCloudflareD1 = typeof USE_CLOUDFLARE_D1 !== 'undefined' && USE_CLOUDFLARE_D1;
    
    if (useCloudflareD1) {
        await fetchCommentsFromD1(page);
    } else {
        await fetchCommentsFromLocal(page);
    }
}

// 从 Cloudflare D1 获取留言
async function fetchCommentsFromD1(page = 1) {
    // 检查缓存
    const cacheKey = `page_${page}`;
    if (commentsCache.has(cacheKey)) {
        const cachedData = commentsCache.get(cacheKey);
        comments = cachedData.comments;
        currentPage = cachedData.currentPage;
        totalPages = cachedData.totalPages;
        totalComments = cachedData.totalComments;
        renderComments();
        renderCommentsStats();
        renderPagination();
        return;
    }
    
    // 避免重复请求
    if (isCommentsLoading) {
        return;
    }
    
    isCommentsLoading = true;
    commentsLoadStartTime = Date.now();
    
    const commentsList = document.getElementById('commentsList');
    
    // 显示加载状态
    if (commentsList) {
        commentsList.innerHTML = `
            <div class="text-center py-5" id="commentsLoading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-2 text-muted">正在加载留言... <span id="loadingTime">0.0</span>s</p>
            </div>
        `;
        
        // 实时更新加载时间
        const loadingTimeElement = document.getElementById('loadingTime');
        const loadingInterval = setInterval(() => {
            if (loadingTimeElement && isCommentsLoading) {
                const elapsed = ((Date.now() - commentsLoadStartTime) / 1000).toFixed(1);
                loadingTimeElement.textContent = elapsed;
            } else {
                clearInterval(loadingInterval);
            }
        }, 100);
    }
    
    try {
        const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api';
        const response = await fetch(`${apiUrl}/comments?page=${page}&limit=10`);
        
        if (response.ok) {
            const data = await response.json();

            comments = data.comments || [];
            currentPage = data.currentPage || page;
            totalPages = data.totalPages || 1;
            totalComments = data.totalComments || 0;

            // 缓存数据
            const cacheData = {
                comments: comments,
                currentPage: currentPage,
                totalPages: totalPages,
                totalComments: totalComments
            };
            commentsCache.set(cacheKey, cacheData);

            renderComments();
            renderCommentsStats();
            renderPagination();
        } else {
            document.getElementById('commentsList').innerHTML = '<p class="text-center py-4 text-muted">暂无留言</p>';
        }
    } catch (error) {
        
        document.getElementById('commentsList').innerHTML = '<p class="text-center py-4 text-muted">加载留言失败，请稍后重试</p>';
    } finally {
        isCommentsLoading = false;
    }
}

// 从本地 database.json 获取留言
async function fetchCommentsFromLocal(page = 1) {
    // 检查缓存
    const cacheKey = `page_${page}`;
    if (commentsCache.has(cacheKey)) {
        const cachedData = commentsCache.get(cacheKey);
        comments = cachedData.comments;
        currentPage = cachedData.currentPage;
        totalPages = cachedData.totalPages;
        totalComments = cachedData.totalComments;
        renderComments();
        renderCommentsStats();
        renderPagination();
        return;
    }
    
    // 避免重复请求
    if (isCommentsLoading) {
        return;
    }
    
    isCommentsLoading = true;
    commentsLoadStartTime = Date.now();
    
    const commentsList = document.getElementById('commentsList');
    
    // 显示加载状态
    if (commentsList) {
        commentsList.innerHTML = `
            <div class="text-center py-5" id="commentsLoading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-2 text-muted">正在加载留言... <span id="loadingTime">0.0</span>s</p>
            </div>
        `;
        
        // 实时更新加载时间
        const loadingTimeElement = document.getElementById('loadingTime');
        const loadingInterval = setInterval(() => {
            if (loadingTimeElement && isCommentsLoading) {
                const elapsed = ((Date.now() - commentsLoadStartTime) / 1000).toFixed(1);
                loadingTimeElement.textContent = elapsed;
            } else {
                clearInterval(loadingInterval);
            }
        }, 100);
    }
    
    try {
        // 从DATA目录下的database.json获取留言列表
        const response = await fetch('./data/database.json');
        
        if (response.ok) {
            const rawData = await response.json();
            
            // 从json数据中提取comments
            let allComments = rawData.comments || [];
            
            // 计算总数
            totalComments = allComments.length;
            
            // 计算总页数 (每页8条)
            const itemsPerPage = 8;
            totalPages = Math.ceil(totalComments / itemsPerPage);
            
            // 获取当前页的数据
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            comments = allComments.slice(startIndex, endIndex);
            
            currentPage = page;
            
            // 缓存数据
            const cacheData = {
                comments: comments,
                currentPage: currentPage,
                totalPages: totalPages,
                totalComments: totalComments
            };
            commentsCache.set(cacheKey, cacheData);
            
            renderComments();
            renderCommentsStats();
            renderPagination();
        } else {
            document.getElementById('commentsList').innerHTML = '<p class="text-center py-4 text-muted">暂无留言</p>';
        }
    } catch (error) {
        
        document.getElementById('commentsList').innerHTML = '<p class="text-center py-4 text-muted">加载留言失败，请稍后重试</p>';
    } finally {
        isCommentsLoading = false;
    }
}

// 渲染留言列表
function renderComments() {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) {
        
        return;
    }

    commentsList.innerHTML = '';

    // 合并已加载的留言和待处理的留言
    // 注意：我们需要确保临时留言始终显示在列表顶部
    let allComments = [...pendingComments, ...comments];

    // 显示所有留言（包括未审核的）
    if (allComments.length === 0) {
        commentsList.innerHTML = '<p class="text-center py-4 text-muted">暂无留言</p>';
        return;
    }
    
    allComments.forEach(comment => {
        // 跳过无效的留言对象
        if (!comment || !comment.name) {

            return;
        }

        const commentItem = document.createElement('div');
        commentItem.className = 'bg-white rounded-lg p-4 message-shadow message-hover';

        const date = new Date(comment.date).toLocaleString();

        // 解析并处理联系方式隐私保护（首页只显示类型，不显示具体信息）
        let contactDisplay = '访客';
        let contactInfo = '';
        let contactType = '';

        if (comment.name.includes(':')) {
          const [type, infoRaw] = comment.name.split(':', 2);
          contactType = type;
          // 首页后端已经返回了隐藏后的数据（QQ:***），直接使用
          contactInfo = infoRaw === '***' ? '***' : maskContactInfo(infoRaw);
          contactDisplay = '访客';
        }

        // 如果有IP地址，尝试获取地理位置信息
        let locationInfo = '';
        if (comment.location && comment.location !== '未知' && comment.location !== '') {
          // 显示格式：来自 XX省XX市
          locationInfo = `来自 ${comment.location} 的 `;
        }
        // 如果没有地理位置信息，不显示任何位置信息

        // 检查是否需要隐藏（未回复的留言）
        const isHidden = comment.isHidden === true;
        const hasReply = comment.reply && comment.reply.trim() !== '';

        // 构建留言内容
        let commentContent = '';

        // 留言头部信息
        let contactIcon = '';
        if (contactType === 'QQ') {
          contactIcon = '<i class="fa fa-qq mr-1 text-gray-400" aria-hidden="true"></i>';
        } else if (contactType === '微信') {
          contactIcon = '<i class="fa fa-weixin mr-1 text-gray-400" aria-hidden="true"></i>';
        } else if (contactType === '邮箱') {
          contactIcon = '<i class="fa fa-envelope mr-1 text-gray-400" aria-hidden="true"></i>';
        }

        // 如果是未回复的留言，只显示位置、名称和时间，不显示内容和联系方式
        if (isHidden) {
            commentContent += `
                <div class="comment-item-header">
                    <div class="comment-item-user">
                        <div>
                            <div class="comment-item-name">${comment.location || ''}---传奇玩家</div>
                            <div class="comment-item-contact">
                                ${contactIcon}
                                ${contactInfo || '***'}
                            </div>
                        </div>
                    </div>
                    <div class="comment-item-date">
                        <i class="fa fa-clock-o mr-1" aria-hidden="true"></i>
                        ${date}
                    </div>
                </div>
                <div class="comment-item-content">
                    <p class="text-gray-700 text-sm leading-tight">
                        此留言不公开，管理员回复后才能公开留言
                    </p>
                </div>
            `;
        } else {
            // 已回复的留言，正常显示
            commentContent += `
                <div class="comment-item-header">
                    <div class="comment-item-user">
                        <div class="comment-item-avatar">
                            <i class="fa fa-user text-xs" aria-hidden="true"></i>
                        </div>
                        <div>
                            <div class="comment-item-name">${locationInfo}传奇玩家</div>
                            <div class="comment-item-contact">
                                ${contactIcon}
                                ${contactInfo || '访客'}
                            </div>
                        </div>
                    </div>
                    <div class="comment-item-date">
                        <i class="fa fa-clock-o mr-1" aria-hidden="true"></i>
                        ${date}
                    </div>
                </div>
            `;

            // 留言内容区域
            let contentHtml = '';

            // 如果是临时留言，显示特殊提示
            if (comment.id && comment.id.toString().startsWith('temp_')) {
                contentHtml = `
                    <div class="alert alert-info mb-2 p-2">
                        <i class="fa fa-info-circle me-1"></i>
                        您的留言已提交，正在等待审核...
                    </div>
                    ${comment.content.replace(/\\n/g, '<br>')}
                `;
            }
            // 如果留言未公开，显示提示信息
            else if (comment.approved === 0 || comment.approved === false || comment.approved === '0') {
                contentHtml = '此留言不公开，管理员回复后才能公开留言';
            } else {
                contentHtml = comment.content.replace(/\\n/g, '<br>');
                
            }

            commentContent += `
                <div class="comment-item-content">
                    <p class="text-gray-700 text-sm leading-tight">
                        ${contentHtml}
                    </p>
                </div>
            `;

            // 如果有管理员回复，则显示
            if (comment.reply) {
                // 获取管理员回复时间
                let replyTime = '';
                if (comment.reply_date) {
                    const replyDate = new Date(comment.reply_date);
                    replyTime = replyDate.toLocaleString();
                }

                commentContent += `
                    <div class="comment-item-reply">
                        <div class="comment-item-reply-header">
                            <div class="comment-item-reply-title">
                                <i class="fa fa-shield mr-1" aria-hidden="true"></i>
                                管理员回复
                            </div>
                            <div class="comment-item-reply-time">
                                ${replyTime}
                            </div>
                        </div>
                        <div class="comment-item-reply-content">
                            <p class="text-gray-700 text-sm leading-tight">
                                ${comment.reply ? comment.reply.replace(/\\n/g, '<br>') : ''}
                            </p>
                        </div>
                    </div>
                `;
            }
        }

        commentItem.innerHTML = commentContent;
        commentsList.appendChild(commentItem);
    });
    
    // 添加留言项的动画效果
    const commentItems = document.querySelectorAll('.bg-white.rounded-lg.p-4');
    commentItems.forEach((item, index) => {
        // 添加延迟，创建逐个出现的效果
        setTimeout(() => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            
            // 触发动画
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, 50);
        }, index * 100);
    });
}

// 渲染留言统计信息
function renderCommentsStats() {
    const totalElement = document.getElementById('totalCommentsCount');
    const repliedElement = document.getElementById('repliedCommentsCount');
    const pendingElement = document.getElementById('pendingCommentsCount');
    
    if (!totalElement) return;
    
    totalElement.textContent = totalComments;
    
    // 更新统计信息
    if (repliedElement) {
        // 显示所有留言中已回复的总数，而不是当前页面的回复数量
        // 通过API获取真实的已回复总数
        fetchRepliedCommentsCount().then(count => {
            repliedElement.textContent = count;
        }).catch(error => {
            
            // 如果API调用失败，回退到当前页面的计算
            let repliedCount = 0;
            comments.forEach(comment => {
                if (comment.reply && comment.reply.trim() !== '') {
                    repliedCount++;
                }
            });
            repliedElement.textContent = repliedCount;
        });
    }
    
    // 获取待回复的全局统计数据
    if (pendingElement) {
        fetchPendingCommentsCount().then(count => {
            pendingElement.textContent = count;
        }).catch(error => {
            
            // 如果API调用失败，回退到当前页面的计算
            let pendingCount = 0;
            comments.forEach(comment => {
                if (!comment.reply || comment.reply.trim() === '') {
                    pendingCount++;
                }
            });
            pendingElement.textContent = pendingCount;
        });
    }
}

// 获取已回复留言的总数
async function fetchRepliedCommentsCount() {
    try {
        const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api';
        const response = await fetch(`${apiUrl}/comments?action=replied-count`);
        if (response.ok) {
            const data = await response.json();
            return data.count;
        } else {
            throw new Error('Failed to fetch replied comments count');
        }
    } catch (error) {
        
        throw error;
    }
}

// 获取待回复留言的总数
async function fetchPendingCommentsCount() {
    try {
        const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api';
        const response = await fetch(`${apiUrl}/comments?action=pending-count`);
        if (response.ok) {
            const data = await response.json();
            return data.count;
        } else {
            throw new Error('Failed to fetch pending comments count');
        }
    } catch (error) {
        
        throw error;
    }
}

// 渲染分页控件
function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    // 如果只有一页或没有留言，不显示分页控件
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页按钮
    if (currentPage > 1) {
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50" data-page="${currentPage - 1}">
                <i class="fa fa-chevron-left text-xs" aria-hidden="true"></i>
            </a>
        `;
    } else {
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500" disabled>
                <i class="fa fa-chevron-left text-xs" aria-hidden="true"></i>
            </a>
        `;
    }
    
    // 页码按钮（最多显示5个页码）
    let startPage, endPage;
    if (totalPages <= 5) {
        // 如果总页数小于等于5，显示所有页码
        startPage = 1;
        endPage = totalPages;
    } else {
        // 如果总页数大于5，显示当前页和前后各2页
        if (currentPage <= 3) {
            startPage = 1;
            endPage = 5;
        } else if (currentPage + 2 >= totalPages) {
            startPage = totalPages - 4;
            endPage = totalPages;
        } else {
            startPage = currentPage - 2;
            endPage = currentPage + 2;
        }
    }
    
    // 显示第一页和省略号
    if (startPage > 1) {
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50" data-page="1">1</a>
        `;
        if (startPage > 2) {
            paginationHTML += `
                <span class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>
            `;
        }
    }
    
    // 显示页码
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `
                <a href="#" class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-primary text-sm font-medium text-white" data-page="${i}">${i}</a>
            `;
        } else {
            paginationHTML += `
                <a href="#" class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50" data-page="${i}">${i}</a>
            `;
        }
    }
    
    // 显示最后一页和省略号
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `
                <span class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>
            `;
        }
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50" data-page="${totalPages}">${totalPages}</a>
        `;
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50" data-page="${currentPage + 1}">
                <i class="fa fa-chevron-right text-xs" aria-hidden="true"></i>
            </a>
        `;
    } else {
        paginationHTML += `
            <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500" disabled>
                <i class="fa fa-chevron-right text-xs" aria-hidden="true"></i>
            </a>
        `;
    }
    
    pagination.innerHTML = paginationHTML;
    
    // 添加分页点击事件
    pagination.querySelectorAll('a[data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page && page !== currentPage && !this.hasAttribute('disabled')) {
                fetchComments(page);
            }
        });
    });
    
    // 预加载下一页（如果存在）
    if (currentPage < totalPages) {
        preloadNextPage(currentPage + 1);
    }
}

// 预加载下一页留言
async function preloadNextPage(page) {
    const cacheKey = `page_${page}`;
    // 如果已经缓存了下一页，不需要预加载
    if (commentsCache.has(cacheKey)) {
        return;
    }

    try {
        // 
        const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api';
        const response = await fetch(`${apiUrl}/comments?page=${page}&limit=8`);
        if (response.ok) {
            const data = await response.json();
            // 缓存数据
            commentsCache.set(cacheKey, data);
            // 
        }
    } catch (error) {
        
    }
}

// 联系方式隐私保护函数
function maskContactInfo(contactInfo) {
    if (!contactInfo) return contactInfo;
    
    // 如果是邮箱
    if (contactInfo.includes('@')) {
        const [localPart, domain] = contactInfo.split('@');
        if (localPart.length <= 5) { // 如果本地部分太短，无法显示前2后3，可以返回原字符串或根据需求处理
            return contactInfo;
        }
        // 邮箱显示前2位+**+后3位@域名，如1234567@qq.com显示为12**567@qq.com
        const start = localPart.substring(0, 4); // 获取前2位
        const end = localPart.substring(localPart.length - 4); // 获取后3位
        const maskedLocalPart = `${start}**${end}`;
        return `${maskedLocalPart}@${domain}`;
    }
    // 如果是QQ号或微信号
    if (contactInfo.length <= 3) {
        return contactInfo; // 太短无法隐藏
    }
    
    // QQ/微信隐藏规则：显示前3位和后3位，5位数显示前2后2位
    if (contactInfo.length === 5) {
        // 5位数显示前2位和后2位
        const start = contactInfo.substring(0, 3);
        const end = contactInfo.substring(contactInfo.length - 3);
        return `${start}**${end}`;
    } else {
        // 其他长度显示前3位和后3位
        const start = contactInfo.substring(0, 4);
        const end = contactInfo.substring(contactInfo.length - 5);
        return `${start}**${end}`;
    }
}

// IP地址隐私保护函数
function maskIPAddress(ip) {
    if (!ip || ip === '未知') return ip;
    
    // 处理IPv4地址
    if (ip.includes('.')) {
        const parts = ip.split('.');
        if (parts.length === 4) {
            // 将最后一段替换为*
            return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
        }
    }
    
    // 处理IPv6地址
    if (ip.includes(':')) {
        const parts = ip.split(':');
        if (parts.length > 1) {
            // 只显示前两段，其余用*代替
            return `${parts[0]}:${parts[1]}:*`;
        }
    }
    
    // 如果不是标准格式，返回原IP
    return ip;
}

// 通过IP获取地理位置信息
async function getLocationByIP(ip) {
    // 如果IP是未知或本地地址，直接返回未知
    if (!ip || ip === '未知' || ip === '127.0.0.1' || ip === '::1') {
        return '未知';
    }

    try {
        // 使用后端API获取地理位置信息（通过腾讯地图API）
        const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api';
        const url = `${apiUrl}/location?ip=${encodeURIComponent(ip)}`;

        // 设置5秒超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            // 

            if (data && data.location) {
                return data.location;
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            
        } else {
            
        }
    }

    // 所有方法都失败，返回未知
    return '未知';
}

// 获取客户端IP地址
async function getClientIP() {
    try {

            try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
            
            const response = await fetch('https://ipinfo.io/json', {
                method: 'GET',
                mode: 'cors',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.ip) {
                    // 
                    return data.ip;
                }
            }
        } catch (error) {
            
        }

        // 尝试使用第二种方法 - ip.sb (对中国国内友好)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
            
            const response = await fetch('https://api.ip.sb/ip', {
                method: 'GET',
                mode: 'cors',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const ip = await response.text();
                if (ip && ip.trim()) {
                    // );
                    return ip.trim();
                }
            }
        } catch (error) {
            
        }
        
        // 如果第一种方法失败，尝试第二种方法 - ipapi.co (对中国国内友好)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
            
            const response = await fetch('https://ipapi.co/json/', {
                method: 'GET',
                mode: 'cors',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.ip) {
                    // 
                    return data.ip;
                }
            }
        } catch (error) {
            
        }
        
        // 如果前两种方法失败，尝试第三种方法 - 通过服务器端获取
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
            
            const response = await fetch('/api/ip', {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.ip) {
                    // 
                    return data.ip;
                }
            }
        } catch (error) {
            
        }
        
        // 如果所有方法都失败，使用本地存储的IP（如果有）
        const storedIP = localStorage.getItem('clientIP');
        if (storedIP) {
            // 
            return storedIP;
        }
        
        
        return '未知';
    } catch (error) {
        
        return '未知';
    }
}

// 提交留言
async function submitComment(event) {
    event.preventDefault();
    
    const contactType = document.getElementById('contactType').value;
    const contactInfo = document.getElementById('contactInfo').value;
    const content = document.getElementById('commentContent').value;
    const submitButton = document.getElementById('submitCommentBtn');
    
    // 
    
    // 验证联系方式类型
    if (!contactType) {
        showCommentStatus('请选择联系方式类型', 'error');
        return;
    }
    
    // 验证联系方式
    if (!contactInfo || contactInfo.trim().length === 0) {
        showCommentStatus('请输入联系方式', 'error');
        return;
    }
    
    // 根据不同的联系方式类型进行验证
    if (contactType === 'QQ') {
        // QQ号码验证：5-15位数字
        if (!/^[1-9][0-9]{4,14}$/.test(contactInfo.trim())) {
            showCommentStatus('请输入有效的QQ号码（5-15位数字，不能以0开头）', 'error');
            return;
        }
    } else if (contactType === '微信') {
        // 微信号验证：6-20位，可包含字母、数字、下划线、减号，不能纯数字
        if (!/^[a-zA-Z0-9_-]{6,20}$/.test(contactInfo.trim()) || /^\d+$/.test(contactInfo.trim())) {
            showCommentStatus('请输入有效的微信号（6-20位，可包含字母、数字、下划线、减号，不能纯数字）', 'error');
            return;
        }
    } else if (contactType === '邮箱') {
        // 邮箱验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactInfo.trim())) {
            showCommentStatus('请输入有效的邮箱地址', 'error');
            return;
        }
    }
    
    // 验证留言内容长度（至少3个字）
    if (!content || content.trim().length <= 3) {
        showCommentStatus('留言内容至少需要3个字', 'error');
        return;
    }
    
    // 禁用提交按钮并显示加载状态，防止重复提交
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>提交中...';
    }
    
    // 显示提交状态
    showCommentStatus('正在提交留言...', 'info');
    
    try {
        // 并行获取IP地址和提交留言，减少等待时间
        const ipPromise = getClientIP();
        
        // 组合联系方式显示名称
        const name = `${contactType}:${contactInfo}`;
        
        // 等待IP地址获取完成
        const ip = await ipPromise;
        // 
        
        // 获取地理位置信息
        const location = await getLocationByIP(ip);
        // 
        
        // 创建临时留言对象用于立即显示
        const tempComment = {
            id: 'temp_' + Date.now(),
            name: name,
            content: content,
            date: new Date().toISOString(),
            approved: false, // 未审核
            ip: ip,
            location: location
        };
        
        // 将临时留言添加到待处理列表中
        pendingComments.push(tempComment);
        
        // 立即刷新留言列表以显示临时留言
        renderComments();
        renderCommentsStats();
        
        // 提交留言，包含IP地址和地理位置信息
        const useCloudflareD1 = typeof USE_CLOUDFLARE_D1 !== 'undefined' && USE_CLOUDFLARE_D1;
        const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api';
        const response = await fetch(`${apiUrl}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, content, ip, location })
        });
        
        // 
        
        if (response.ok) {
            const result = await response.json();
            document.getElementById('commentForm').reset();
            showCommentStatus('留言提交成功，等待审核后显示', 'success');
            
            // 从待处理列表中移除临时留言
            pendingComments = pendingComments.filter(comment => comment.id !== tempComment.id);
            
            // 将新提交的留言添加到正式留言列表的开头
            // 使用服务器返回的完整数据，包括ID和其他可能的字段
            if (result && result.id) {
                comments.unshift({
                    id: result.id,
                    name: result.name,
                    content: result.content,
                    date: result.date,
                    approved: result.approved !== undefined ? result.approved : false,
                    ip: result.ip,
                    location: result.location || ''
                });
            }
            
            // 增加总留言数
            totalComments++;
            
            // 重新渲染留言列表和统计信息
            renderComments();
            renderCommentsStats();
            renderPagination();
        } else {
            const error = await response.json();
            showCommentStatus(error.error || '提交失败', 'error');
            // 从待处理列表中移除临时留言
            pendingComments = pendingComments.filter(comment => comment.id !== tempComment.id);
            renderComments(); // 重新渲染留言列表
        }
    } catch (error) {
        
        showCommentStatus('提交失败，请稍后再试', 'error');
        // 从待处理列表中移除临时留言
        pendingComments = pendingComments.filter(comment => comment.id && !comment.id.startsWith('temp_'));
        renderComments(); // 重新渲染留言列表
    } finally {
        // 恢复提交按钮状态
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="bi bi-send me-2"></i>提交留言';
        }
    }
}

// 显示留言状态
function showCommentStatus(message, type) {
    const statusElement = document.getElementById('commentStatus');
    statusElement.textContent = message;
    
    // 清除之前的类名
    statusElement.className = 'comment-status';
    
    // 添加新的类名
    if (type) {
        statusElement.classList.add(type);
    }
    
    // 如果是info类型，不自动隐藏
    if (type !== 'info') {
        setTimeout(() => {
            statusElement.className = 'comment-status';
        }, 5000);
    }
}

// 返回顶部功能
function setupBackToTop() {
    const backToTopButton = document.getElementById('backToTop');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) { // 当页面滚动超过300px时显示按钮
            backToTopButton.classList.remove('d-none');
        } else {
            backToTopButton.classList.add('d-none');
        }
    });
    
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // 平滑滚动
        });
    });
}

// 平滑滚动到锚点
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // 考虑固定导航栏的高度
                    behavior: 'smooth'
                });
            }
        });
    });
}



// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 
    
    // 完全分离文件列表和留言加载，确保文件列表优先显示
    // 立即开始加载文件列表
    fetchFiles(); // fetchFiles函数内部会调用renderFileList
    
    // 独立异步加载留言，不依赖文件列表加载完成
    setTimeout(() => {
        fetchComments();
    }, 500); // 延迟500毫秒加载留言，确保文件列表优先
    
    // 移动端优化：处理触摸事件以改善用户体验
    if ('ontouchstart' in window) {
        // 为文件列表项添加触摸支持
        document.addEventListener('touchstart', function(e) {
            // 在触摸开始时添加视觉反馈
            const target = e.target.closest('.list-group-item');
            if (target) {
                target.classList.add('touch-active');
            }
        }, { passive: true });
        
        document.addEventListener('touchend', function(e) {
            // 在触摸结束时移除视觉反馈
            const target = e.target.closest('.list-group-item');
            if (target) {
                target.classList.remove('touch-active');
            }
        }, { passive: true });
    }
    
    // 添加留言表单提交事件
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', submitComment);
    } else {
        
    }
    
    // 设置返回顶部按钮
    setupBackToTop();
    
    // 设置平滑滚动
    setupSmoothScroll();
    
    // 为留言项添加渐入动画效果
    setTimeout(() => {
        const commentItems = document.querySelectorAll('.comment-item');
        commentItems.forEach((item, index) => {
            // 添加延迟，创建逐个出现的效果
            setTimeout(() => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                
                // 触发动画
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, 50);
            }, index * 100);
        });
    }, 500);
    
    // 定期刷新文件列表以确保同步（仅在页面可见时刷新）
    let filesRefreshInterval;
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // 页面隐藏时清除定时器
            if (filesRefreshInterval) {
                clearInterval(filesRefreshInterval);
                filesRefreshInterval = null;
            }
        } else {
            // 页面显示时重新启动定时器
            if (!filesRefreshInterval) {
                filesRefreshInterval = setInterval(fetchFiles, 600000); // 每60秒刷新一次
            }
        }
    });
    
    // 初始设置定时器
    filesRefreshInterval = setInterval(fetchFiles, 600000); // 每60秒刷新一次
    
    // 添加联系方式类型变化事件监听器
    const contactTypeSelect = document.getElementById('contactType');
    const contactInfoInput = document.getElementById('contactInfo');
    const contactInfoHelp = document.getElementById('contactInfoHelp');

    // 更新联系方式输入框的占位符和帮助文本
    function updateContactInfoPlaceholderAndHelp(contactType) {
        const placeholders = {
            'QQ': '请输入您的QQ号码（5-15位数字）',
            '微信': '请输入您的微信号（6-20位）',
            '邮箱': '请输入您的邮箱地址'
        };

        if (contactType && placeholders[contactType]) {
            contactInfoInput.placeholder = placeholders[contactType];
            contactInfoHelp.textContent = placeholders[contactType];
        } else {
            contactInfoInput.placeholder = '请输入您的QQ号/微信号/邮箱地址';
            contactInfoHelp.textContent = '';
        }
    }
    
    if (contactTypeSelect && contactInfoInput && contactInfoHelp) {
        contactTypeSelect.addEventListener('change', function() {
            updateContactInfoPlaceholderAndHelp(this.value);
        });

        // 实时验证联系方式
        function validateContactInfo() {
            const contactType = contactTypeSelect.value;
            const contactValue = contactInfoInput.value.trim();

            if (!contactType) {
                contactInfoHelp.textContent = '请先选择联系方式类型';
                return;
            }

            let isValid = false;
            let message = '';

            switch(contactType) {
                case 'QQ':
                    if (/^[1-9][0-9]{4,14}$/.test(contactValue)) {
                        isValid = true;
                        message = 'QQ号码格式正确';
                    } else if (contactValue.length === 0) {
                        message = '请输入您的QQ号码（5-15位数字）';
                    } else {
                        message = 'QQ号码格式错误（5-15位数字，不能以0开头）';
                    }
                    break;
                case '微信':
                    if (/^[a-zA-Z0-9_-]{6,20}$/.test(contactValue) && !/^\d+$/.test(contactValue)) {
                        isValid = true;
                        message = '微信号格式正确';
                    } else if (contactValue.length === 0) {
                        message = '请输入您的微信号（6-20位）';
                    } else {
                        message = '微信号格式错误（6-20位，可包含字母、数字、下划线、减号，不能纯数字）';
                    }
                    break;
                case '邮箱':
                    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) {
                        isValid = true;
                        message = '邮箱地址格式正确';
                    } else if (contactValue.length === 0) {
                        message = '请输入您的邮箱地址';
                    } else {
                        message = '邮箱地址格式错误';
                    }
                    break;
            }

            contactInfoHelp.textContent = message;
            contactInfoHelp.style.color = isValid ? 'green' : 'red';
        }

        contactInfoInput.addEventListener('input', function() {
            validateContactInfo();
        });
    }
    
// 添加导航栏点击事件监听器
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            // 显示所有部分
            document.querySelector('.file-list-section').style.display = 'block';
            document.querySelector('.comments-section').style.display = 'block';
            
            // 处理文件列表链接
            if (targetId === '#files') {
                // 确保显示文件列表
                renderFileList();
            }
            
            // 平滑滚动到目标位置
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // 考虑固定导航栏的高度
                    behavior: 'smooth'
                });
            }
        });
    });
    
// 添加管理员回复后的消息监听器
// 使用 BroadcastChannel 监听来自管理后台的刷新通知
let commentChannel = null;

function setupCommentRefresh() {
    // 先关闭现有的channel（如果存在）
    if (commentChannel) {
        commentChannel.close();
    }
    
    // 创建新的 BroadcastChannel 监听来自管理后台的刷新通知
    if (typeof BroadcastChannel !== 'undefined') {
        commentChannel = new BroadcastChannel('refresh-comments');
        commentChannel.onmessage = function(event) {
            // 如果收到刷新消息，重新获取留言列表
            if (event.data === 'admin-reply') {
                
                fetchComments(1); // 从第一页开始刷新
                // 不立即关闭 channel，以便后续可以继续接收消息
            }
        };
    }
}

// 监听来自管理后台 postMessage 事件
window.addEventListener('message', function(event) {
    // 检查消息类型
    if (event.data && event.data.type === 'admin-reply') {
        
        fetchComments(1); // 从第一页开始刷新
    }
});

// 设置管理员回复标记
const adminReplied = localStorage.getItem('adminReplied');
if (adminReplied === 'true') {
    // 如果有管理员回复标记，刷新留言列表
    
    fetchComments(1); // 从第一页开始刷新
    // 清除标记
    localStorage.removeItem('adminReplied');
    
    // 设置留言刷新监听器
    setupCommentRefresh();
    
    // 添加一个窗口加载事件作为备选方案
    window.addEventListener('load', function() {
        // 确保设置了留言刷新监听器
        setupCommentRefresh();
    });
    
    // 设置主页标记
    localStorage.setItem('mainWindowOpen', 'true');
}

}); // 结束 DOMContentLoaded