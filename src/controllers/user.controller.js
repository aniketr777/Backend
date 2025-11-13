import asyncHandler from "../utils/asyncHandler.js";
import User from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose, { mongo } from "mongoose";
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;

  // 1️ Basic validation
  if (!username || !fullname || !email || !password) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  // 2️ Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({
      message: "User already exists",
    });
  }

  const avatarLocalPath = req.files?.avatar[0].path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  )
    coverImageLocalPath = req.files.coverImage[0].path;

  if (!avatarLocalPath) {
    return res.status(400).json({
      message: "Avatar image is required",
    });
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    return res.status(500).json({
      message: "Error uploading avatar image",
    });
  }

  // 3️ Create user

  const newUser = await User.create({
    username: username.toLowerCase(),
    email,
    fullname,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // 4️ Respond success
  return res.status(201).json({
    message: "User registered successfully",
    user: {
      id: newUser._id,
      username: username.toLowerCase(),
      email: newUser.email,
      fullname: newUser.fullname,
      avatar: avatar?.url,
      coverImage: coverImage?.url || "",
    },
  });
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (e) {
    throw new Error("Error generating tokens");
  }
};

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const user = await User.findOne({ $or: [{ email, username }] });
  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    return res.status(401).json({
      message: "Invalid credentials",
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // making cookies
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -watchHistory"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      message: "Login successful",
      user: loggedInUser,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
});

const logoutUser = asyncHandler(async (req, res) => {
  // Corrected findByIdAndUpdate
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true, // This is the third argument
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({
      message: "User Logout Success",
    });
});

const refreshAcessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      return res.status(401).json({
        message: "unauthorized request",
      });
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = User.findById(decodedToken?._id);
    if (!user) {
      return res.status(401).json({
        message: "unauthorized access",
      });
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      return res.status(401).json({
        message: "unauthorized access",
      });
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .json({
        message: "token recreated successfully",
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
  } catch (e) {
    return res.status(401).json({
      message: "invalid refresh token",
    });
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      return res.stauts(400).json({
        message: "Invalid old Password",
      });
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({
      message: "Password Change Successfully",
    });
  } catch (e) {
    return res.status(400).json({
      message: e,
    });
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).send(req.user).json({
    message: "current user fetched successfully",
  });
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  try {
    const { fullname, email } = req.body;
    if (!fullname || !email) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const user = User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullname,
          email,
        },
      },
      { new: true }
    ).select("-password");
    return res.status(200).send(user).json({
      message: "Account details updated succesfully",
    });
  } catch (e) {
    return res.status(400).json({
      message: e,
    });
  }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  try {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
      return res.status(400).json({
        message: "Avatar file is missing ",
      });
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
      return res.status(400).json({
        message: "Error while uploading on avatar",
      });
    }

    await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      { new: true }
    ).select("-password");

    return res.status(400).json({
      message: "Avatar image updated ",
    });
  } catch (e) {
    return res.status(400).json({
      message: e,
    });
  }
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  try {
    const CoverImageLocalPath = req.file?.path;
    if (!CoverImageLocalPath) {
      return res.status(400).json({
        message: "CoverImage file is missing ",
      });
    }

    const CoverImage = await uploadOnCloudinary(CoverImageLocalPath);
    if (!CoverImage.url) {
      return res.status(400).json({
        message: "Error while uploading on CoverImage",
      });
    }

    await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          coverImage: avatar.url,
        },
      },
      { new: true }
    ).select("-password");

    return res.status(400).json({
      message: "Cover image updated ",
    });
  } catch (e) {
    return res.status(400).json({
      message: e,
    });
  }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  // 1️⃣ Check if username is provided
  if (!username?.trim()) {
    return res.status(400).json({
      message: "Username is missing",
    });
  }

  // 2️⃣ Run aggregation pipeline
  const channelProfile = await User.aggregate([
    // Match the user by username
    {
      $match: {
        username: username.toLowerCase(),
      },
    },

    // Lookup all subscribers (users who subscribed to this channel)
    {
      $lookup: {
        from: "subscriptions", // collection name in MongoDB (should be lowercase)
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },

    // Lookup all channels that this user has subscribed to
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },

    // Add subscriber counts and subscription counts
    {
      $addFields: {
        subscriberCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribedTo" },

        // Check if current logged-in user is subscribed
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },

    // Project only required fields
    {
      $project: {
        fullname: 1,
        username: 1,
        subscriberCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  // 3️⃣ If no user found
  if (!channelProfile?.length) {
    return res.status(404).json({ message: "User not found" });
  }

  // 4️⃣ Return profile
  return res.status(200).json(channelProfile[0]);
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchhistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:{
                $project:{
                  fullName:1,
                  avatar:1,
                  username:1
                }
              }
            }
          },{
            $addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }
        ]
      }
    }
  ]);

  return res.status(200).send(user[0].watchHistory)
  .json({
    message:"Watch history fetched successfully"
  })
});

export {
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
};
