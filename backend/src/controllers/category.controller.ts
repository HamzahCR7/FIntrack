import { Request, Response, NextFunction, Router } from 'express';
import { CategoryService } from '../services/category.service';
import { validateBody } from '../common/middleware/validateRequest';
import { CreateCategorySchema } from '../dtos/category.dto';

export class CategoryController {
  public router = Router();
  private categoryService = new CategoryService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/', this.getAllCategories);
    this.router.get('/:id', this.getCategoryById);
    this.router.post('/', validateBody(CreateCategorySchema), this.createCategory);
  }

  private getAllCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.categoryService.getAllCategories();
      res.status(200).json({ status: 'success', data: categories });
    } catch (err) {
      next(err);
    }
  };

  private getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await this.categoryService.getCategoryById(req.params.id);
      res.status(200).json({ status: 'success', data: category });
    } catch (err) {
      next(err);
    }
  };

  private createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await this.categoryService.createCategory(req.body);
      res.status(201).json({ status: 'success', data: category });
    } catch (err) {
      next(err);
    }
  };
}
