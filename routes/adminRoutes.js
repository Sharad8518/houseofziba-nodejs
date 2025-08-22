const {addAdmin, loginAdmin, logoutAdmin,logoutAllDevices} = require("../controllers/adminControllers")
const { addProduct, getProducts, getProductById } = require("../controllers/productContrrollers");
const {addNavbarItem,
getNavbarItem,
editNavbarItem,
getNavbarItemById,
deleteNavbarItem} = require("../controllers/navbarControllers")

const { 
    getHeaders, 
    getHeader, 
    createHeader, 
    updateHeader, 
    deleteHeader 
} = require( "../controllers/headerController.js");

const { 
    getCategories, 
    createCategory,
    updateCategory,
    deleteCategory 
} =require( "../controllers/categoryController.js")

const {
  getSubCategories,
  getSubCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} = require('../controllers/subCategoryController.js');

const {
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
} = require('../controllers/collectionController.js')

const express = require('express'); 
const verifyJWT = require("../middlewares/verifyJWT");
const {upload} = require("../middlewares/file_handler")
const router = express.Router();

router.post("/add", addAdmin);
router.post("/login", loginAdmin);
router.post("/logout", logoutAdmin);
router.post("/logoutAll", logoutAllDevices);
router.use(verifyJWT("admin"));
router.post("/products", upload.array("images", 6), addProduct);
router.get("/products", getProducts);
router.get("/products/:id", getProductById);
router.get("/headers", getHeaders);
router.get("/headers/:id", getHeader);
router.post("/headers", createHeader);
router.put("/headers/:id", updateHeader);
router.delete("/headers/:id", deleteHeader);
router.get("/categorys", getCategories);
router.post("/categorys", createCategory);
router.put("/categorys/:id", updateCategory);
router.delete("/categorys/:id", deleteCategory);
router.get("/categorys", getCategories);
router.post("/categorys", createCategory);
router.put("/categorys/:id", updateCategory);
router.delete("/categorys/:id", deleteCategory);
router.get("/subcategorys", getSubCategories);           // GET all
router.get("/subcategorys/:id", getSubCategory);        // GET one
router.post("/subcategorys", createSubCategory);        // CREATE
router.put("/subcategorys/:id", updateSubCategory);     // UPDATE
router.delete("/subcategorys/:id", deleteSubCategory);  // DELETE
router.get("/collections", getCollections);             // GET all
router.get("/collections/:id", getCollection);         // GET one
router.post("/collections", createCollection);          // CREATE
router.put("/collections/:id", updateCollection);      // UPDATE
router.delete("/collections/:id", deleteCollection);   // DELETE

module.exports = router;