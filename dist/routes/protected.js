import { Router } from "express";
const router = Router();
router.get('/', async (req, res) => {
    return res.status(200).json({ message: "Protected route accessed" });
});
export default router;
