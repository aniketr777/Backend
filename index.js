import express from "express";
import cors from "cors";
const app= express();
import dotenv from "dotenv";
import connectDb from "./src/db/db.js";
dotenv.config({path:'./.env'});
import cookieParser from "cookie-parser";
import userRouter from "./src/routes/user.route.js";



app.use(cors({
    origin:'http://localhost:5173'
}));
app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static('dist'));
connectDb();






app.get('/',(req,res)=>{
    res.send("Hello World");
})


app.use('/api/v1/users',userRouter);



const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})

