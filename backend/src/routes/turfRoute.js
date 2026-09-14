import express from 'express';
import { getTurf, listTurfs } from '../controllers/turfController.js';

const router = express.Router();
router.get('/', listTurfs);
router.get('/:id', getTurf);

export default router;