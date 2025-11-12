import {Router} from 'express'
import { registerUser ,loginUser,logoutUser} from '../controllers/user.controller.js';
import {authMiddleware} from "../middleware/auth.middleware.js"
const router = Router();
import {upload} from '../middleware/multer.middleware.js';

router.route("/register").post(upload.fields([
    {
        name: 'avatar',
        maxCount: 1
    },
    {
        name: 'coverImage',
        maxCount: 1
    }

]),registerUser);

router.route("/login").post(loginUser);
router.route("/logout").post(authMiddleware, logoutUser);


export default router;