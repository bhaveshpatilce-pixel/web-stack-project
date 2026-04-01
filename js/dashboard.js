const API_BASE = "/api";

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!token || !loggedInUser) {
        window.location.href = "index.html";
        return;
    }

    const userNameDisplay = document.getElementById("userNameDisplay");
    if (userNameDisplay) userNameDisplay.textContent = loggedInUser.fullName;

    let tasks = [];
    let currentFilter = "all";
    let searchQuery = "";
    let sortOption = "newest";

    const taskGrid = document.getElementById("taskGrid");
    const taskForm = document.getElementById("taskForm");
    const taskModal = document.getElementById("taskModal");
    const logoutBtn = document.getElementById("logoutBtn");
    const openAddTaskModalBtn = document.getElementById("openAddTaskModal");
    const closeModalBtn = document.getElementById("closeModal");
    const searchInput = document.getElementById("searchInput");
    const filterBtns = document.querySelectorAll(".filter-btn");
    const sortBySelect = document.getElementById("sortBy");
    const themeToggle = document.getElementById("themeToggle");

    const showToast = (message, type = "info") => {
        const container = document.getElementById("toastContainer");
        if (!container) return;
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;

        let icon = "fas fa-info-circle";
        if (type === "success") icon = "fas fa-check-circle";
        if (type === "error") icon = "fas fa-exclamation-circle";

        toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = "fadeOut 0.3s forwards";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    const apiRequest = async (path, options = {}) => {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {}),
            },
        });

        const data = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("loggedInUser");
                window.location.href = "index.html";
            }
            throw new Error(data.message || "Request failed");
        }

        return data;
    };

    const fetchTasks = async () => {
        const data = await apiRequest("/tasks");
        tasks = data.tasks || [];
    };

    const renderTasks = () => {
        let filteredTasks = tasks.filter((task) => {
            const description = task.description || "";
            const matchesSearch =
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                description.toLowerCase().includes(searchQuery.toLowerCase());

            if (currentFilter === "all") return matchesSearch;
            if (currentFilter === "completed") return matchesSearch && task.status === "completed";
            if (currentFilter === "pending") return matchesSearch && task.status === "pending";
            return matchesSearch;
        });

        if (sortOption === "newest") {
            filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortOption === "oldest") {
            filteredTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (sortOption === "alphabetical") {
            filteredTasks.sort((a, b) => a.title.localeCompare(b.title));
        }

        taskGrid.innerHTML = "";

        if (filteredTasks.length === 0) {
            taskGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>No tasks found</h3>
                    <p>${searchQuery ? "Try searching something else!" : "Start organizing your day by adding a new task!"}</p>
                </div>
            `;
            return;
        }

        filteredTasks.forEach((task) => {
            const card = document.createElement("div");
            card.className = "task-card";
            card.innerHTML = `
                <div class="task-head">
                    <h3 class="task-title">${task.title}</h3>
                    <span class="task-status-badge badge-${task.status}">${task.status}</span>
                </div>
                <p class="task-desc">${task.description || "No description provided"}</p>
                <div class="task-footer">
                    <span class="task-date">
                        <i class="far fa-calendar-alt"></i> ${new Date(task.createdAt).toLocaleDateString()}
                    </span>
                    <div class="task-actions">
                        <button class="action-btn complete-btn" onclick="toggleTaskStatus('${task._id}')" title="${task.status === "completed" ? "Mark Pending" : "Mark Completed"}">
                            <i class="fas ${task.status === "completed" ? "fa-undo" : "fa-check"}"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="openEditModal('${task._id}')" title="Edit Task">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTask('${task._id}')" title="Delete Task">
                            <i class="fas fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
            taskGrid.appendChild(card);
        });
    };

    window.deleteTask = async (id) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            await apiRequest(`/tasks/${id}`, { method: "DELETE" });
            await fetchTasks();
            renderTasks();
            showToast("Task deleted successfully", "info");
        } catch (error) {
            showToast(error.message, "error");
        }
    };

    window.toggleTaskStatus = async (id) => {
        try {
            const task = tasks.find((t) => t._id === id);
            if (!task) return;
            const nextStatus = task.status === "completed" ? "pending" : "completed";
            await apiRequest(`/tasks/${id}`, {
                method: "PUT",
                body: JSON.stringify({ status: nextStatus }),
            });
            await fetchTasks();
            renderTasks();
            showToast(`Task marked as ${nextStatus}`, "success");
        } catch (error) {
            showToast(error.message, "error");
        }
    };

    window.openEditModal = (id) => {
        const task = tasks.find((t) => t._id === id);
        if (!task) return;
        document.getElementById("taskId").value = task._id;
        document.getElementById("taskTitle").value = task.title;
        document.getElementById("taskDesc").value = task.description || "";
        document.getElementById("modalTitle").textContent = "Edit Task";
        document.getElementById("saveBtnText").textContent = "Update Task";
        taskModal.classList.add("active");
    };

    openAddTaskModalBtn.addEventListener("click", () => {
        taskForm.reset();
        document.getElementById("taskId").value = "";
        document.getElementById("modalTitle").textContent = "Create New Task";
        document.getElementById("saveBtnText").textContent = "Add Task";
        taskModal.classList.add("active");
    });

    closeModalBtn.addEventListener("click", () => {
        taskModal.classList.remove("active");
    });

    window.addEventListener("click", (e) => {
        if (e.target === taskModal) taskModal.classList.remove("active");
    });

    taskForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("taskId").value;
        const title = document.getElementById("taskTitle").value.trim();
        const description = document.getElementById("taskDesc").value.trim();

        try {
            if (id) {
                await apiRequest(`/tasks/${id}`, {
                    method: "PUT",
                    body: JSON.stringify({ title, description }),
                });
                showToast("Task updated!", "success");
            } else {
                await apiRequest("/tasks", {
                    method: "POST",
                    body: JSON.stringify({ title, description }),
                });
                showToast("Task added successfully!", "success");
            }

            await fetchTasks();
            renderTasks();
            taskModal.classList.remove("active");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderTasks();
    });

    filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            filterBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    sortBySelect.addEventListener("change", (e) => {
        sortOption = e.target.value;
        renderTasks();
    });

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("loggedInUser");
        window.location.href = "index.html";
    });

    const toggleTheme = () => {
        document.body.classList.toggle("dark-mode");
        const isDarkMode = document.body.classList.contains("dark-mode");
        localStorage.setItem("theme", isDarkMode ? "dark" : "light");
        themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    };

    themeToggle.addEventListener("click", toggleTheme);

    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    try {
        await fetchTasks();
        renderTasks();
    } catch (error) {
        showToast(error.message, "error");
    }
});
