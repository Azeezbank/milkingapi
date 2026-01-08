import { Router } from "express";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
 return res.status(200).json({ message: "Admin protected route accessed" });
})

export default router;