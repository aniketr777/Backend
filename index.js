import express from "express";
import cors from "cors";
const app= express();
import dotenv from "dotenv";
dotenv.config();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/',(req,res)=>{
    res.send("Hello World");
})


const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})

