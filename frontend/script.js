// Task Manager Frontend Script


document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleRegisterLink = document.getElementById('toggleRegister');
    const toggleLoginLink = document.getElementById('toggleLogin');
    const authSection = document.getElementById('authSection');
    const taskSection = document.getElementById('taskSection');
    const headerNav = document.getElementById('headerNav');
    const logoutBtn = document.getElementById('logoutBtn');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const taskList = document.getElementById('taskList');
    const taskModal = document.getElementById('taskModal');
    const addTaskForm = document.getElementById('addTaskForm');
    const closeTaskModalBtn = document.getElementById('closeTaskModal');
    const updateTaskModal = document.getElementById('updateTaskModal');
    const updateTaskForm = document.getElementById('updateTaskForm');
    const closeUpdateModalBtn = document.getElementById('closeUpdateModal');
    const viewTaskModal = document.getElementById('viewTaskModal');
    const closeViewModalBtn = document.getElementById('closeViewModal');

    let currentUser = null;
    let tasks = [];
    let editingTaskId = null;

    // Event listeners
    toggleRegisterLink.addEventListener('click', function(e) {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    toggleLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    document.getElementById('login').addEventListener('submit', handleLogin);
    document.getElementById('register').addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
    
    const cancelLoginBtn = document.getElementById('cancelLogin');
    const cancelRegisterBtn = document.getElementById('cancelRegister');
    if (cancelLoginBtn) cancelLoginBtn.addEventListener('click', function() {
        document.getElementById('login').reset();
    });
    if (cancelRegisterBtn) cancelRegisterBtn.addEventListener('click', function() {
        document.getElementById('register').reset();
    });
    
    addTaskBtn.addEventListener('click', openTaskModal);
    closeTaskModalBtn.addEventListener('click', closeTaskModal);
    taskModal.querySelector('.modal-overlay').addEventListener('click', closeTaskModal);
    addTaskForm.addEventListener('submit', handleAddTask);
    closeUpdateModalBtn.addEventListener('click', closeUpdateModal);
    updateTaskModal.querySelector('.modal-overlay').addEventListener('click', closeUpdateModal);
    updateTaskForm.addEventListener('submit', handleUpdateTask);
    closeViewModalBtn.addEventListener('click', closeViewModal);
    viewTaskModal.querySelector('.modal-overlay').addEventListener('click', closeViewModal);
    searchInput.addEventListener('input', filterTasks);
    filterStatus.addEventListener('change', filterTasks);

    // Functions
    function handleLogin(e) {
        e.preventDefault();
        // Simulate login - in real app, this would call backend API
        const username = e.target.querySelector('input[type="text"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        
        // Mock authentication
        if (username && password) {
            currentUser = { username };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showTaskManager();
            e.target.reset();
        }
    }

    function handleRegister(e) {
        e.preventDefault();
        // Simulate registration - in real app, this would call backend API
        const username = e.target.querySelectorAll('input[type="text"]')[0].value;
        const email = e.target.querySelector('input[type="email"]').value;
        const studentNumber = e.target.querySelector('#registerStudentNumber').value;
        const major = e.target.querySelector('#registerMajor').value;
        const password = e.target.querySelector('input[type="password"]').value;

        // Mock registration
        if (username && email && password && studentNumber && major) {
            currentUser = { username, email, studentNumber, major };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showTaskManager();
            e.target.reset();
        }
    }

    function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            currentUser = null;
            localStorage.removeItem('currentUser');
            tasks = [];
            authSection.classList.remove('hidden');
            taskSection.classList.add('hidden');
            headerNav.classList.add('hidden');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        }
    }

    function showTaskManager() {
        authSection.classList.add('hidden');
        taskSection.classList.remove('hidden');
        headerNav.classList.remove('hidden');
        updateUsernameDisplay();
        loadTasks();
    }

    // Check if user is already logged in
    function checkAuthStatus() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            showTaskManager();
        }
    }

    function updateUsernameDisplay() {
        if (currentUser) {
            const label = `${currentUser.username} (${currentUser.studentNumber || ''})`;
            document.getElementById('usernameDisplay').textContent = label;
        }
    }

    function showAddTaskForm() {
        // For simplicity, using prompt - in real app, show a modal
        const title = prompt('Task title:');
        const description = prompt('Task description:');
        const deadline = prompt('Deadline (YYYY-MM-DD):');
        
        if (title && description && deadline) {
            addTask({ title, description, deadline, status: 'pending' });
        }
    }

    function addTask(task) {
        task.id = Date.now();
        tasks.push(task);
        renderTasks();
    }

    function loadTasks() {
        const storedTasks = localStorage.getItem('tasks_' + currentUser.username);
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        } else {
            tasks = [];
        }
        renderTasks();
    }

    function renderTasks() {
        taskList.innerHTML = '';
        const filteredTasks = getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #999;">No tasks found. Create one to get started!</td></tr>';
        } else {
            filteredTasks.forEach(task => {
                const taskElement = createTaskElement(task);
                taskList.appendChild(taskElement);
            });
        }
        
        updateStats();
        localStorage.setItem('tasks_' + currentUser.username, JSON.stringify(tasks));
    }

    function createTaskElement(task) {
        const tr = document.createElement('tr');
        const statusLabel = task.status.replace('-', ' ').charAt(0).toUpperCase() + task.status.replace('-', ' ').slice(1);
        const completeButtonText = task.status === 'completed' ? 'Undo' : 'Complete';
        tr.innerHTML = `
            <td class="task-title-cell">${task.title}</td>
            <td class="task-date-cell">📅 ${task.deadline}</td>
            <td><span class="status-badge ${task.status}">${statusLabel}</span></td>
            <td>
                <div class="task-action-buttons">
                    <button class="view-btn" onclick="viewTask(${task.id})">👁️ View</button>
                    <button class="edit-btn" onclick="editTask(${task.id})">📝 Edit</button>
                    <button class="complete-btn" onclick="completeTask(${task.id})">${completeButtonText}</button>
                    <button class="delete-btn" onclick="deleteTask(${task.id})">🗑️ Delete</button>
                </div>
            </td>
        `;
        return tr;
    }

    function updateStats() {
        const totalTasks = tasks.length;
        const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
        const completedCount = tasks.filter(t => t.status === 'completed').length;
        const pendingCount = tasks.filter(t => t.status === 'pending').length;

        document.getElementById('taskCount').textContent = totalTasks;
        document.getElementById('totalTasksCount').textContent = totalTasks;
        document.getElementById('inProgressCount').textContent = inProgressCount;
        document.getElementById('completedCount').textContent = completedCount;
        document.getElementById('pendingCount').textContent = pendingCount;
    }

    function getFilteredTasks() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusFilter = filterStatus.value;
        
        return tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm) || 
                                task.description.toLowerCase().includes(searchTerm);
            const matchesStatus = !statusFilter || task.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }

    function filterTasks() {
        renderTasks();
    }

    // Global functions for onclick
    window.editTask = function(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            editingTaskId = id;
            document.getElementById('updateTaskTitle').value = task.title;
            document.getElementById('updateTaskDescription').value = task.description;
            document.getElementById('updateTaskDeadline').value = task.deadline;
            document.getElementById('updateTaskStatus').value = task.status;
            updateTaskModal.classList.remove('hidden');
            document.getElementById('updateTaskTitle').focus();
        }
    };

    window.deleteTask = function(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            tasks = tasks.filter(t => t.id !== id);
            renderTasks();
        }
    };

    window.completeTask = function(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.status = task.status === 'completed' ? 'pending' : 'completed';
            renderTasks();
        }
    };

    // Modal functions
    function openTaskModal() {
        taskModal.classList.remove('hidden');
        document.getElementById('taskTitle').focus();
    }

    function closeTaskModal() {
        taskModal.classList.add('hidden');
        addTaskForm.reset();
    }

    function handleAddTask(e) {
        e.preventDefault();
        
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const deadline = document.getElementById('taskDeadline').value;
        const status = document.getElementById('taskStatus').value;

        if (title && deadline) {
            const newTask = {
                title,
                description,
                deadline,
                status
            };
            addTask(newTask);
            closeTaskModal();
        }
    }

    function closeUpdateModal() {
        updateTaskModal.classList.add('hidden');
        updateTaskForm.reset();
        editingTaskId = null;
    }

    function handleUpdateTask(e) {
        e.preventDefault();
        
        if (!editingTaskId) return;
        
        const task = tasks.find(t => t.id === editingTaskId);
        if (task) {
            task.title = document.getElementById('updateTaskTitle').value;
            task.description = document.getElementById('updateTaskDescription').value;
            task.deadline = document.getElementById('updateTaskDeadline').value;
            task.status = document.getElementById('updateTaskStatus').value;
            
            renderTasks();
            closeUpdateModal();
        }
    }

    function closeViewModal() {
        viewTaskModal.classList.add('hidden');
    }

    // Global functions for onclick
    window.viewTask = function(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            document.getElementById('viewTaskTitle').textContent = task.title;
            document.getElementById('viewTaskDescription').textContent = task.description || 'No description provided';
            document.getElementById('viewTaskDeadline').textContent = task.deadline;
            
            const statusLabel = task.status.replace('-', ' ').charAt(0).toUpperCase() + task.status.replace('-', ' ').slice(1);
            const statusElement = document.getElementById('viewTaskStatus');
            statusElement.textContent = statusLabel;
            statusElement.className = `status-badge ${task.status}`;
            
            viewTaskModal.classList.remove('hidden');
        }
    };

    // Initialize
    checkAuthStatus();
});