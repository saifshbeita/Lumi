import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adultRouter from "./adult";
import studentsRouter from "./students";
import studentRouter from "./student";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/adult", adultRouter);
router.use("/students", studentsRouter);
router.use("/student", studentRouter);

export default router;
