const Task = require("../models/Task");

const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, tasks });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Task title is required" });
    }

    const task = await Task.create({
      user: req.user.id,
      title: title.trim(),
      description: description ? description.trim() : "",
    });

    return res.status(201).json({ success: true, message: "Task created", task });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    const task = await Task.findOne({ _id: id, user: req.user.id });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (status !== undefined) task.status = status;

    await task.save();

    return res.status(200).json({ success: true, message: "Task updated", task });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Task.findOneAndDelete({ _id: id, user: req.user.id });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    return res.status(200).json({ success: true, message: "Task deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
