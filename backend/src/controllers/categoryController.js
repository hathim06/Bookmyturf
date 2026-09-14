import categoryModel from "../models/category.js";

export const listCategories = async (req, res) => {
  try {
    const categories = await categoryModel.find({ owner: req.user._id }).sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to load categories." });
  }
};

export const createCategory = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Category name is required." });
    if (name.length > 40) return res.status(400).json({ message: "Category name must be 40 characters or fewer." });
    const category = await categoryModel.create({ owner: req.user._id, name });
    res.status(201).json({ message: "Category added.", category });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? "This category already exists." : error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await categoryModel.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!category) return res.status(404).json({ message: "Category not found." });
    res.json({ message: "Category removed." });
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to remove category." });
  }
};