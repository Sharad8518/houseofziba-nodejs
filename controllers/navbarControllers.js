const Header = require("../models/Header");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");
// Add a category or a subcategory
// Get all headers with categories and subcategories (for navbar)
const getNavbarData = async (req, res) => {
  try {
    const headers = await Header.find({ status: "Active",showNavbar:"Yes" }).sort({ createdAt: 1 });

    const result = await Promise.all(
      headers.map(async (header) => {
        const categories = await Category.find({ header: header._id }).sort({ createdAt: 1 });
        
        const categoriesWithSub = await Promise.all(
          categories.map(async (cat) => {
            const subCategories = await SubCategory.find({ category: cat._id }).sort({ createdAt: 1 });
            return {
              _id: cat._id,
              name: cat.name,
              image:cat.image,
              slug: cat.slug,
              subCategories: subCategories.map((sub) => ({
                _id: sub._id,
                name: sub.name,
                slug: sub.slug,
              })),
            };
          })
        );

        return {
          _id: header._id,
          title: header.title,
          image: header.image,
          slug: header.slug,
          categories: categoriesWithSub,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Optional: Get single header by slug with categories and subcategories
const getHeaderBySlug = async (req, res) => {
  try {
    const header = await Header.findOne({ slug: req.params.slug });
    if (!header) return res.status(404).json({ error: "Header not found" });

    const categories = await Category.find({ header: header._id }).sort({ createdAt: 1 });

    const categoriesWithSub = await Promise.all(
      categories.map(async (cat) => {
        const subCategories = await SubCategory.find({ category: cat._id }).sort({ createdAt: 1 });
        return {
          _id: cat._id,
          name: cat.name,
          slug: cat.slug,
          subCategories: subCategories.map((sub) => ({
            _id: sub._id,
            name: sub.name,
            slug: sub.slug,
          })),
        };
      })
    );

    res.json({
      _id: header._id,
      title: header.title,
      slug: header.slug,
      categories: categoriesWithSub,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getNavbarData, getHeaderBySlug };