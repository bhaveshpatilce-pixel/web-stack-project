/**
 * Dashboard Logic for TaskMaster Pro
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Authentication Check
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser) {
        window.location.href = 'index.html';
        return;
    }

    // Display user name
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) userNameDisplay.textContent = loggedInUser.fullName;

    // 2. State & Variables
    let tasks = JSON.parse(localStorage.getItem(`tasks_${loggedInUser.id}`)) || [];
    let currentFilter = 'all';
    let searchQuery = '';
    let sortOption = 'newest';

    // 3. Select DOM Elements
    const taskGrid = document.getElementById('taskGrid');
    const taskForm = document.getElementById('taskForm');
    const taskModal = document.getElementById('taskModal');
    const logoutBtn = document.getElementById('logoutBtn');
    const openAddTaskModalBtn = document.getElementById('openAddTaskModal');
    const closeModalBtn = document.getElementById('closeModal');
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const sortBySelect = document.getElementById('sortBy');
    const themeToggle = document.getElementById('themeToggle');

    // 4. Utility Functions
    const saveTasks = () => {
        localStorage.setItem(`tasks_${loggedInUser.id}`, JSON.stringify(tasks));
    };

    const showToast = (message, type = 'info') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fas fa-info-circle';
        if (type === 'success') icon = 'fas fa-check-circle';
        if (type === 'error') icon = 'fas fa-exclamation-circle';
        
        toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // 5. Render Tasks
    const renderTasks = () => {
        // Filter tasks
        let filteredTasks = tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 task.description.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (currentFilter === 'all') return matchesSearch;
            if (currentFilter === 'completed') return matchesSearch && task.status === 'completed';
            if (currentFilter === 'pending') return matchesSearch && task.status === 'pending';
            return matchesSearch;
        });

        // Sort tasks
        if (sortOption === 'newest') {
            filteredTasks.sort((a, b) => b.createdAt - a.createdAt);
        } else if (sortOption === 'oldest') {
            filteredTasks.sort((a, b) => a.createdAt - b.createdAt);
        } else if (sortOption === 'alphabetical') {
            filteredTasks.sort((a, b) => a.title.localeCompare(b.title));
        }

        // Clear grid
        taskGrid.innerHTML = '';

        if (filteredTasks.length === 0) {
            taskGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>No tasks found</h3>
                    <p>${searchQuery ? 'Try searching something else!' : 'Start organizing your day by adding a new task!'}</p>
                </div>
            `;
            return;
        }

        filteredTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.innerHTML = `
                <div class="task-head">
                    <h3 class="task-title">${task.title}</h3>
                    <span class="task-status-badge badge-${task.status}">${task.status}</span>
                </div>
                <p class="task-desc">${task.description || 'No description provided'}</p>
                <div class="task-footer">
                    <span class="task-date">
                        <i class="far fa-calendar-alt"></i> ${new Date(task.createdAt).toLocaleDateString()}
                    </span>
                    <div class="task-actions">
                        <button class="action-btn complete-btn" onclick="toggleTaskStatus(${task.id})" title="${task.status === 'completed' ? 'Mark Pending' : 'Mark Completed'}">
                            <i class="fas ${task.status === 'completed' ? 'fa-undo' : 'fa-check'}"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="openEditModal(${task.id})" title="Edit Task">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTask(${task.id})" title="Delete Task">
                            <i class="fas fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
            taskGrid.appendChild(card);
        });
    };

    // 6. Global Task Actions (Attached to window for inline onclick)
    window.deleteTask = (id) => {
        if (confirm('Are you sure you want to delete this task?')) {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
            showToast('Task deleted successfully', 'info');
        }
    };

    window.toggleTaskStatus = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.status = task.status === 'completed' ? 'pending' : 'completed';
            saveTasks();
            renderTasks();
            showToast(`Task marked as ${task.status}`, 'success');
        }
    };

    window.openEditModal = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            document.getElementById('taskId').value = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDesc').value = task.description;
            document.getElementById('modalTitle').textContent = 'Edit Task';
            document.getElementById('saveBtnText').textContent = 'Update Task';
            taskModal.classList.add('active');
        }
    };

    // 7. Event Listeners
    openAddTaskModalBtn.addEventListener('click', () => {
        taskForm.reset();
        document.getElementById('taskId').value = '';
        document.getElementById('modalTitle').textContent = 'Create New Task';
        document.getElementById('saveBtnText').textContent = 'Add Task';
        taskModal.classList.add('active');
    });

    closeModalBtn.addEventListener('click', () => {
        taskModal.classList.remove('active');
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) taskModal.classList.remove('active');
    });

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('taskId').value;
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDesc').value.trim();

        if (id) {
            // Edit existing
            const index = tasks.findIndex(t => t.id == id);
            tasks[index] = { ...tasks[index], title, description };
            showToast('Task updated!', 'success');
        } else {
            // Add new
            const newTask = {
                id: Date.now(),
                title,
                description,
                status: 'pending',
                createdAt: Date.now()
            };
            tasks.push(newTask);
            showToast('Task added successfully!', 'success');
        }

        saveTasks();
        renderTasks();
        taskModal.classList.remove('active');
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTasks();
    });

    // Filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Sort
    sortBySelect.addEventListener('change', (e) => {
        sortOption = e.target.value;
        renderTasks();
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    });

    // Theme Toggle Logic
    const toggleTheme = () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    };

    themeToggle.addEventListener('click', toggleTheme);

    // Load initial theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // Initial render
    renderTasks();
});
