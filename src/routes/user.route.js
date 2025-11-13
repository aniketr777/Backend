import {Router} from 'express'
import {
  registerUser,
  loginUser,
  getUserChannelProfile,
  logoutUser,
  refreshAcessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getWatchHistory
} from "../controllers/user.controller.js";
import {authMiddleware} from "../middleware/auth.middleware.js"
const router = Router();
import {upload} from '../middleware/multer.middleware.js';
import { verify } from 'crypto';

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
router.route("refresh-token").post(refreshAcessToken)
router.route("/change-password").post(authMiddleware,changeCurrentPassword);
router.route("/current-user").get(authMiddleware,getCurrentUser);
router.route("/update-account").patch(authMiddleware,updateAccountDetails);


router.route("/avatar").patch(authMiddleware,upload.single("avatar"),updateUserAvatar)


router.route("/cover-image").patch(authMiddleware, upload.single("coverImage"), updateUserCoverImage);

router.route("/c/:username").get(authMiddleware,getUserChannelProfile)

router.route("/history").get(authMiddleware,getWatchHistory);



export default router;