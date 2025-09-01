import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MovieController } from 'src/modules/movies/controllers/movies.controller';
import { MovieService } from 'src/modules/movies/services/movies.service';
import { ContentType } from 'src/modules/movies/enums/content-type.enum';


describe('MovieController', () => {
  let controller: MovieController;
  let mockMovieService: jest.Mocked<MovieService>;

  const mockPaginatedResult = {
    data: [
      {
        id: '650e8400-e29b-41d4-a716-446655440001',
        title: 'The Shawshank Redemption',
        description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
        releaseDate: new Date('1994-09-23T00:00:00.000Z'),
        coverImage: 'https://example.com/shawshank.jpg',
        type: ContentType.MOVIE,
        averageRating: 3.5,
        totalRatings: 4,
        cast: ['Tom Hanks', 'Brad Pitt'],
        createdAt: new Date('2025-08-25T13:31:31.441Z'),
        updatedAt: new Date('2025-08-25T20:04:02.632Z'),
      },
      {
        id: '650e8400-e29b-41d4-a716-446655440030',
        title: 'Her',
        description: 'In a near future, a lonely writer develops an unlikely relationship with an operating system designed to meet his every need.',
        releaseDate: new Date('2013-12-18T00:00:00.000Z'),
        coverImage: 'https://example.com/her.jpg',
        type: ContentType.MOVIE,
        averageRating: 3,
        totalRatings: 1,
        cast: ['Leonardo DiCaprio', 'Scarlett Johansson'],
        createdAt: new Date('2025-08-25T13:31:31.441Z'),
        updatedAt: new Date('2025-08-29T12:01:09.956Z'),
      }
    ],
    total: 50,
    page: 1,
    totalPages: 25,
    hasNext: true,
    hasPrevious: false,
  };

  beforeEach(async () => {
    mockMovieService = {
      getTopRated: jest.fn(),
      getMovieById: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovieController],
      providers: [
        {
          provide: MovieService,
          useValue: mockMovieService,
        },
      ],
    }).compile();

    controller = module.get<MovieController>(MovieController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopRated', () => {
    it('should return paginated movies with default parameters', async () => {
      mockMovieService.getTopRated.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getTopRated();

      expect(result).toEqual(mockPaginatedResult);
      expect(mockMovieService.getTopRated).toHaveBeenCalledWith(
        undefined,
        { page: 1, limit: 10 },
        { query: undefined, minRating: undefined } 
      );
    });

    it('should handle MOVIE type filter correctly', async () => {

      const movieOnlyResult = {
        ...mockPaginatedResult,
        data: mockPaginatedResult.data.filter(movie => movie.type === ContentType.MOVIE)
      };
      mockMovieService.getTopRated.mockResolvedValue(movieOnlyResult);

      const result = await controller.getTopRated(ContentType.MOVIE);

      expect(result).toEqual(movieOnlyResult);
      expect(mockMovieService.getTopRated).toHaveBeenCalledWith(
        ContentType.MOVIE,
        { page: 1, limit: 10 },
        { query: undefined, minRating: undefined }
      );
    });

    it('should handle TV_SHOW type filter correctly', async () => {

      const tvShowResult = {
        data: [{
          id: '650e8400-e29b-41d4-a716-446655440100',
          title: 'Breaking Bad',
          description: 'A high school chemistry teacher turned methamphetamine producer',
          releaseDate: new Date('2008-01-20T00:00:00.000Z'),
          coverImage: 'https://example.com/breaking-bad.jpg',
          type: ContentType.TV_SHOW,
          averageRating: 4.5,
          totalRatings: 10,
          cast: ['Bryan Cranston', 'Aaron Paul'],
          createdAt: new Date('2025-08-25T13:31:31.441Z'),
          updatedAt: new Date('2025-08-25T13:31:31.441Z'),
        }],
        total: 1,
        page: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      };
      mockMovieService.getTopRated.mockResolvedValue(tvShowResult);

      const result = await controller.getTopRated(ContentType.TV_SHOW);

      expect(result).toEqual(tvShowResult);
      expect(mockMovieService.getTopRated).toHaveBeenCalledWith(
        ContentType.TV_SHOW,
        { page: 1, limit: 10 },
        { query: undefined, minRating: undefined }
      );
    });

    it('should handle custom pagination parameters', async () => {
      mockMovieService.getTopRated.mockResolvedValue(mockPaginatedResult);

      await controller.getTopRated(undefined, 2, 20);

      expect(mockMovieService.getTopRated).toHaveBeenCalledWith(
        undefined,
        { page: 2, limit: 20 },
        { query: undefined, minRating: undefined }
      );
    });

    it('should handle search query parameter', async () => {
      const searchResult = {
        data: [mockPaginatedResult.data[0]],
        total: 1,
        page: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      };
      mockMovieService.getTopRated.mockResolvedValue(searchResult);

      await controller.getTopRated(undefined, 1, 10, 'shawshank');

      expect(mockMovieService.getTopRated).toHaveBeenCalledWith(
        undefined,
        { page: 1, limit: 10 },
        { query: 'shawshank', minRating: undefined }
      );
    });

    it('should handle minRating parameter', async () => {
      mockMovieService.getTopRated.mockResolvedValue(mockPaginatedResult);

      await controller.getTopRated(undefined, 1, 10, undefined, 4.0);

      expect(mockMovieService.getTopRated).toHaveBeenCalledWith(
        undefined,
        { page: 1, limit: 10 },
        { query: undefined, minRating: 4.0 }
      );
    });

    it('should handle all parameters together', async () => {
      mockMovieService.getTopRated.mockResolvedValue(mockPaginatedResult);

      await controller.getTopRated(ContentType.MOVIE, 2, 15, 'redemption', 3.0);

      expect(mockMovieService.getTopRated).toHaveBeenCalledWith(
        ContentType.MOVIE,
        { page: 2, limit: 15 },
        { query: 'redemption', minRating: 3.0 }
      );
    });

    it('should handle empty search results', async () => {
      const emptyResult = {
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      };
      mockMovieService.getTopRated.mockResolvedValue(emptyResult);

      const result = await controller.getTopRated(undefined, 1, 10, 'nonexistent');

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
    });

    it('should handle pagination with hasNext true', async () => {
      const paginatedResult = {
        ...mockPaginatedResult,
        page: 1,
        totalPages: 25,
        hasNext: true,
        hasPrevious: false,
      };
      mockMovieService.getTopRated.mockResolvedValue(paginatedResult);

      const result = await controller.getTopRated(undefined, 1, 2);

      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(false);
      expect(result.totalPages).toBe(25);
    });

    it('should handle middle page pagination', async () => {
      const middlePageResult = {
        ...mockPaginatedResult,
        page: 5,
        totalPages: 25,
        hasNext: true,
        hasPrevious: true,
      };
      mockMovieService.getTopRated.mockResolvedValue(middlePageResult);

      const result = await controller.getTopRated(undefined, 5, 2);

      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(true);
      expect(result.page).toBe(5);
    });

    it('should propagate service errors', async () => {
      const serviceError = new BadRequestException('Invalid pagination parameters');
      mockMovieService.getTopRated.mockRejectedValue(serviceError);

      await expect(controller.getTopRated()).rejects.toThrow(serviceError);
    });

    it('should handle decimal minRating values', async () => {
      mockMovieService.getTopRated.mockResolvedValue(mockPaginatedResult);

      await controller.getTopRated(undefined, 1, 10, undefined, 3.75);

      expect(mockMovieService.getTopRated).toHaveBeenCalledWith(
        undefined,
        { page: 1, limit: 10 },
        { query: undefined, minRating: 3.75 }
      );
    });

    it('should handle edge case with limit at maximum (50)', async () => {
      mockMovieService.getTopRated.mockResolvedValue(mockPaginatedResult);

      await controller.getTopRated(undefined, 1, 50);

      expect(mockMovieService.getTopRated).toHaveBeenCalledWith(
        undefined,
        { page: 1, limit: 50 },
        { query: undefined, minRating: undefined }
      );
    });
  });
});