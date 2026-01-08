import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';

dotenv.config();


const JWT_SECRET = process.env.JWT_SECRET

export const register = async (req: Request, res:Response) => {
  const { name, email, phone, username, password, confirmPassword, role } = req.body;

  try {

    if (!name || !phone || !username || !password) {
      console.error('All fields are required')
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      console.error('Passwords do not match')
      return  res.status(400).json({ message: "Passwords do not match" });
    }

    // check if username or phone exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { phone },
          { email }
        ]
      }
    });

    if (existing) {
      console.error('Username, email or phone already in use')
      return res.status(400).json({ message: "Username, email or phone already in use" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        name,
        email,
        phone,
        username,
        password: hashedPassword,
        role: role || "Team Member"
      }
    });

    // send response
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}


export const login = async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  const user = await prisma.user.findFirst({ 
    where: { 
      OR: [ 
        { email: identifier }, 
        { username: identifier} 
      ] } });
  if (!user) {
    console.error('Invalid credentials')
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    console.error('Invalid credentials')
    return res.status(401).json({ message: "Invalid credentials" });
  }

   // create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET!,
      { expiresIn: "1h" }
    );

    // send JWT as cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000 // 1 hour
    });

  res.status(200).json({ message: "Login successful" });
};