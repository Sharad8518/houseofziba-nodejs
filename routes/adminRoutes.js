const {
  addAdmin,
  loginAdmin,
  logoutAdmin,
  logoutAllDevices,
} = require("../controllers/adminControllers");
const {
  addProduct,
  getProducts,
  getProductById,
  addfbtoProduct,
  removefbtFromProduct,
  addSimilarProduct,
} = require("../controllers/productContrrollers");
const {
  addNavbarItem,
  getNavbarItem,
  editNavbarItem,
  getNavbarItemById,
  deleteNavbarItem,
} = require("../controllers/navbarControllers");

const {
  getHeaders,
  getHeader,
  createHeader,
  updateHeader,
  deleteHeader,
  getHeadersAllowCategory,
} = require("../controllers/headerController.js");

const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController.js");

const {
  getSubCategories,
  getSubCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} = require("../controllers/subCategoryController.js");

const {
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
} = require("../controllers/collectionController.js");

const {
  createFBTItem,
  getFBTItems,
  updateFBTItem,
  deleteFBTItem,
} = require("../controllers/frequentlyBoughtTogetherController.js");

const {
  getAllOrder,
  updateOrderStatus,
} = require("../controllers/orderController.js");

const {
  addBanner,
  getBanners,
  getActiveBanners,
  updateBanner,
  deleteBanner,
} = require("../controllers/bannerController");

const {
  createPromotional,
  getPromotions,
  getPromotionById,
  updatePromotion,
  deletePromotion,
} = require("../controllers/promotionalController");

const { getAllUser } = require("../controllers/useControllers.js");
const {
  addPolicy,
getPolicies,
updatePolicy,
deletePolicy} = require("../controllers/policyController.js")

const express = require("express");
const verifyJWT = require("../middlewares/verifyJWT");
const { upload } = require("../middlewares/file_handler");
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
router.get("/headers/category", getHeadersAllowCategory);
router.get("/headers/:id", getHeader);
router.post("/headers",upload.single("image"), createHeader);
router.put("/headers/:id",upload.single("image"), updateHeader);
router.delete("/headers/:id", deleteHeader);
router.get("/categorys", getCategories);
router.post("/categorys", createCategory);
router.put("/categorys/:id", updateCategory);
router.delete("/categorys/:id", deleteCategory);
router.get("/categorys", getCategories);
router.post("/categorys", createCategory);
router.put("/categorys/:id", updateCategory);
router.delete("/categorys/:id", deleteCategory);
router.get("/subcategorys", getSubCategories); // GET all
router.get("/subcategorys/:id", getSubCategory); // GET one
router.post("/subcategorys", createSubCategory); // CREATE
router.put("/subcategorys/:id", updateSubCategory); // UPDATE
router.delete("/subcategorys/:id", deleteSubCategory); // DELETE
router.get("/collections", getCollections); // GET all
router.get("/collections/:id", getCollection); // GET one
router.post("/collections", upload.single("image"), createCollection); // CREATE
router.put("/collections/:id", updateCollection); // UPDATE
router.delete("/collections/:id", deleteCollection); // DELETE
router.post("/FBTItem", upload.array("images", 6), createFBTItem);
router.get("/FBTItem", getFBTItems);
router.put("/FBTItem/:id", updateFBTItem);
router.delete("/FBTItem/:id", deleteFBTItem);
router.post("/add-fbt", addfbtoProduct); // Add FBT item
router.delete("/remove-fbt", removefbtFromProduct);
router.post("/add-similar", addSimilarProduct);
router.get("/orders", getAllOrder);
router.put("/updateOrdersStatus", updateOrderStatus);
router.post("/banner", upload.single("image"), addBanner);
router.get("/banner", getBanners);
router.get("/banner/active", getActiveBanners);
router.put("/banner/:id", upload.single("image"), updateBanner);
router.delete("/banner/:id", deleteBanner);
router.post("/promotional", createPromotional);
router.get("/promotional", getPromotions);
router.put("/promotional/:id", updatePromotion);
router.delete("/promotional/:id", deletePromotion);
router.get("/users", getAllUser);
router.post("/policy",addPolicy)
router.get("/policy",getPolicies)
router.put("/policy/:id",updatePolicy)
router.delete("/policy/:id",deletePolicy)

module.exports = router;
