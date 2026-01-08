import { Router } from 'express';
import { register, login } from '../controller/auth.controller.js';
const route = Router();
route.post('/register', register);
route.post('/login', login);
export default route;
