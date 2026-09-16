import { Request, Response, NextFunction, Router } from 'express';
import { prisma } from '../config/prisma';
import { validateBody } from '../common/middleware/validateRequest';
import { CreateQuickItemSchema, UpdateQuickItemSchema } from '../dtos/quickItem.dto';

export class QuickItemController {
  public router = Router();

  constructor() {
    this.router.get('/', this.getAll);
    this.router.post('/', validateBody(CreateQuickItemSchema), this.create);
    this.router.patch('/:id', validateBody(UpdateQuickItemSchema), this.update);
    this.router.delete('/:id', this.remove);
  }

  private getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await prisma.quickItem.findMany({ orderBy: [{ isCompleted: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }] });
      res.status(200).json({ status: 'success', data: items });
    } catch (err) {
      next(err);
    }
  };

  private create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await prisma.quickItem.create({
        data: {
          type: req.body.type,
          title: req.body.title,
          details: req.body.details || null,
          price: req.body.price ?? null,
          category: req.body.category || null,
          priority: req.body.priority || 'NORMAL',
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        },
      });
      res.status(201).json({ status: 'success', data: item });
    } catch (err) {
      next(err);
    }
  };

  private update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await prisma.quickItem.update({
        where: { id: req.params.id },
        data: {
          ...(req.body.type !== undefined && { type: req.body.type }),
          ...(req.body.title !== undefined && { title: req.body.title }),
          ...(req.body.details !== undefined && { details: req.body.details || null }),
          ...(req.body.price !== undefined && { price: req.body.price }),
          ...(req.body.category !== undefined && { category: req.body.category || null }),
          ...(req.body.priority !== undefined && { priority: req.body.priority }),
          ...(req.body.dueDate !== undefined && { dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null }),
          ...(req.body.isCompleted !== undefined && { isCompleted: req.body.isCompleted }),
        },
      });
      res.status(200).json({ status: 'success', data: item });
    } catch (err) {
      next(err);
    }
  };

  private remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.quickItem.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}