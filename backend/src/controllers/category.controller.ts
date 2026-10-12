import { Request, Response, NextFunction, Router } from 'express';
import { CategoryService } from '../services/category.service';
import { validateBody } from '../common/middleware/validateRequest';
import { CreateCategorySchema } from '../dtos/category.dto';
import { OpenCategoryKnowledgeService } from '../services/openCategoryKnowledge.service';

export class CategoryController {
  public router = Router();
  private categoryService = new CategoryService();
  private openKnowledgeService = new OpenCategoryKnowledgeService();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get('/', this.getAllCategories);
    this.router.get('/suggestions/search', this.getCategorySuggestions);
    this.router.get('/merchant-suggestions/search', this.getMerchantSuggestions);
    this.router.get('/items/search', this.searchOpenItems);
    this.router.get('/:id', this.getCategoryById);
    this.router.post('/', validateBody(CreateCategorySchema), this.createCategory);
  }

  private getCategorySuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const text = typeof req.query.text === 'string' ? req.query.text : '';
      const type = typeof req.query.type === 'string' ? req.query.type.toUpperCase() : 'EXPENSE';
      const suggestions = await this.categoryService.suggestCategories(text, type);
      res.status(200).json({ status: 'success', data: suggestions });
    } catch (err) {
      next(err);
    }
  };

  private getMerchantSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : '';
      const subcategoryId = typeof req.query.subcategoryId === 'string' ? req.query.subcategoryId : '';
      const text = typeof req.query.text === 'string' ? req.query.text : '';
      const type = typeof req.query.type === 'string' ? req.query.type.toUpperCase() : 'EXPENSE';
      const suggestions = await this.categoryService.suggestMerchants(categoryId, text, type, subcategoryId);
      res.status(200).json({ status: 'success', data: suggestions });
    } catch (err) {
      next(err);
    }
  };

  private searchOpenItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : '';
      const text = typeof req.query.text === 'string' ? req.query.text : '';
      const suggestions = await this.openKnowledgeService.search(category, text);
      res.status(200).json({ status: 'success', data: suggestions });
    } catch (err) {
      next(err);
    }
  };

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
