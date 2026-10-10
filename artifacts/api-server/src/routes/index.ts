import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adultRouter from "./adult";
import studentsRouter from "./students";
import studentRouter from "./student";
import studentChatRouter from "./student-chat";
import studentVoiceRouter from "./student-voice";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/adult", adultRouter);
router.use("/students", studentsRouter);
router.use("/student", studentRouter);
router.use("/student/chats", studentChatRouter);
router.use("/student", studentVoiceRouter);

export default router;
