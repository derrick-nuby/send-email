import { Router } from "express";
import { createAccount, loginUser, getAllUsers, modifyUser, deleteUser, logoutUser, getSingleUser, adminDeleteUser } from "../controllers/user.js";
import { validateUserRegister, validateUserLogin, validateUserUpdate } from '../middlewares/userValidation.js';
import { adminAuthJWT, userAuthJWT } from '../middlewares/auth.js';

const router: Router = Router();

router.post("/", validateUserRegister, createAccount);

router.post("/login", validateUserLogin, loginUser);

router.get("/all", adminAuthJWT, getAllUsers);

router.put("/", userAuthJWT, validateUserUpdate, modifyUser);

router.delete("/", userAuthJWT, deleteUser);

router.delete("/admin/:id", userAuthJWT, adminDeleteUser);

router.get('/logout', userAuthJWT, logoutUser);

router.get('/you', userAuthJWT, getSingleUser);

export default router;