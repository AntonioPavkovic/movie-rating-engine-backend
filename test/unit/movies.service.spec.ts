import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ContentType } from 'src/modules/movies/enums/content-type.enum';
import { MovieService } from 'src/modules/movies/services/movies.service';

describe('MovieService', () => {
  let service: MovieService;
  let mockMoviesRepository: jest.Mocked<any>;
  let mockCacheManager: jest.Mocked<Cache>;

  const mockMovie = {
    id: '650e8400-e29b-41d4-a716-446655440001',
    title: 'The Shawshank Redemption',
    description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    releaseDate: new Date('1994-09-23T00:00:00.000Z'),
    coverImage: 'https://example.com/shawshank.jpg',
    type: ContentType.MOVIE,
    averageRating: 3.5,
    totalRatings: 4,
    cast: [
      { actorId: '650e8400-e29b-41d4-a716-446655441001', actorName: 'Tom Hanks', actorImage: 'https://example.com/tom-hanks.jpg', role: 'Andy Dufresne' },
      { actorId: '650e8400-e29b-41d4-a716-446655441002', actorName: 'Brad Pitt', actorImage: 'https://example.com/brad-pitt.jpg', role: 'Ellis Boyd "Red" Redding' }
    ],
    createdAt: new Date('2025-08-25T13:31:31.441Z'),
    updatedAt: new Date('2025-08-25T20:04:02.632Z'),
  };

  const mockMovies = [
    {
      id: '650e8400-e29b-41d4-a716-446655440001',
      title: 'The Shawshank Redemption',
      description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
      releaseDate: new Date('1994-09-23T00:00:00.000Z'),
      coverImage: 'https://example.com/shawshank.jpg',
      type: ContentType.MOVIE,
      averageRating: 3.5,
      totalRatings: 4,
      cast: [
        { actorId: '650e8400-e29b-41d4-a716-446655441001', actorName: 'Tom Hanks', actorImage: 'https://example.com/tom-hanks.jpg', role: 'Andy Dufresne' },
        { actorId: '650e8400-e29b-41d4-a716-446655441002', actorName: 'Brad Pitt', actorImage: 'https://example.com/brad-pitt.jpg', role: 'Red' }
      ],
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
      cast: [
        { actorId: '650e8400-e29b-41d4-a716-446655441003', actorName: 'Leonardo DiCaprio', actorImage: 'https://example.com/leo.jpg', role: 'Theodore' },
        { actorId: '650e8400-e29b-41d4-a716-446655441004', actorName: 'Scarlett Johansson', actorImage: 'https://example.com/scarlett.jpg', role: 'Samantha (voice)' }
      ],
      createdAt: new Date('2025-08-25T13:31:31.441Z'),
      updatedAt: new Date('2025-08-29T12:01:09.956Z'),
    },
    {
      id: '650e8400-e29b-41d4-a716-446655440100',
      title: 'Breaking Bad',
      description: 'A high school chemistry teacher turned methamphetamine producer',
      releaseDate: new Date('2008-01-20T00:00:00.000Z'),
      coverImage: 'https://example.com/breaking-bad.jpg',
      type: ContentType.TV_SHOW,
      averageRating: 4.5,
      totalRatings: 10,
      cast: [
        { actorId: '650e8400-e29b-41d4-a716-446655441005', actorName: 'Bryan Cranston', actorImage: 'https://example.com/bryan.jpg', role: 'Walter White' },
        { actorId: '650e8400-e29b-41d4-a716-446655441006', actorName: 'Aaron Paul', actorImage: 'https://example.com/aaron.jpg', role: 'Jesse Pinkman' }
      ],
      createdAt: new Date('2025-08-25T13:31:31.441Z'),
      updatedAt: new Date('2025-08-25T13:31:31.441Z'),
    }
  ];

  beforeEach(async () => {
    mockMoviesRepository = {
      findTopRated: jest.fn(),
      findById: jest.fn(),
      updateRatingStats: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
      wrap: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovieService,
        {
          provide: 'IMoviesRepository',
          useValue: mockMoviesRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<MovieService>(MovieService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopRated', () => {
    it('should return paginated movies successfully', async () => {
      const pagination = { page: 1, limit: 10 };
      const searchOptions = { query: 'redemption', minRating: 3.0 };
      const repositoryResult = {
        movies: mockMovies,
        total: 50,
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockMoviesRepository.findTopRated.mockResolvedValue(repositoryResult);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.getTopRated(ContentType.MOVIE, pagination, searchOptions);

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            type: expect.any(String),
            cast: expect.arrayContaining([expect.any(String)]),
          })
        ]),
        total: 50,
        page: 1,
        totalPages: 5,
        hasNext: true,
        hasPrevious: false,
      });

      expect(mockMoviesRepository.findTopRated).toHaveBeenCalledWith({
        type: ContentType.MOVIE,
        page: 1,
        limit: 10,
        minRating: 3.0,
        searchQuery: 'redemption',
      });

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('top-movies'),
        result,
        expect.any(Number)
      );
    });

    it('should return cached result when available', async () => {
      const pagination = { page: 1, limit: 2 };
      const cachedResult = {
        data: [
          {
            id: '650e8400-e29b-41d4-a716-446655440001',
            title: 'The Shawshank Redemption',
            cast: ['Tom Hanks', 'Brad Pitt'],
            averageRating: 3.5,
            totalRatings: 4,
          }
        ],
        total: 50,
        page: 1,
        totalPages: 25,
        hasNext: true,
        hasPrevious: false,
      };

      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.getTopRated(ContentType.MOVIE, pagination);

      expect(result).toEqual(cachedResult);
      expect(mockMoviesRepository.findTopRated).not.toHaveBeenCalled();
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringContaining('top-movies')
      );
    });

    it('should validate pagination parameters', async () => {
      const invalidPagination = { page: 0, limit: 10 };

      await expect(
        service.getTopRated(ContentType.MOVIE, invalidPagination)
      ).rejects.toThrow(BadRequestException);
      
      await expect(
        service.getTopRated(ContentType.MOVIE, invalidPagination)
      ).rejects.toThrow('Page must be greater than 0');
    });

    it('should validate limit is within bounds', async () => {
      const invalidPagination = { page: 1, limit: 100 };

      await expect(
        service.getTopRated(ContentType.MOVIE, invalidPagination)
      ).rejects.toThrow('Limit must be between 1 and 50');
    });

    it('should build correct cache key with all parameters', async () => {
      const pagination = { page: 2, limit: 5 };
      const searchOptions = { query: 'breaking', minRating: 4.0 };
      
      mockCacheManager.get.mockResolvedValue(null);
      mockMoviesRepository.findTopRated.mockResolvedValue({ movies: [], total: 0 });

      await service.getTopRated(ContentType.TV_SHOW, pagination, searchOptions);

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'top-movies:type:TV_SHOW:page:2:limit:5:query:breaking:minRating:4'
      );
    });

    it('should handle TV_SHOW content type', async () => {
      const pagination = { page: 1, limit: 10 };
      const tvShowData = mockMovies.filter(m => m.type === ContentType.TV_SHOW);
      const repositoryResult = { movies: tvShowData, total: 1 };

      mockCacheManager.get.mockResolvedValue(null);
      mockMoviesRepository.findTopRated.mockResolvedValue(repositoryResult);

      const result = await service.getTopRated(ContentType.TV_SHOW, pagination);

      expect(result.data[0].type).toBe(ContentType.TV_SHOW);
      expect(mockMoviesRepository.findTopRated).toHaveBeenCalledWith({
        type: ContentType.TV_SHOW,
        page: 1,
        limit: 10,
        minRating: undefined,
        searchQuery: undefined,
      });
    });

    it('should handle empty search results', async () => {
      const pagination = { page: 1, limit: 10 };
      const repositoryResult = { movies: [], total: 0 };

      mockCacheManager.get.mockResolvedValue(null);
      mockMoviesRepository.findTopRated.mockResolvedValue(repositoryResult);

      const result = await service.getTopRated(ContentType.MOVIE, pagination);

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      });
    });

    it('should handle search with minRating filter', async () => {
      const pagination = { page: 1, limit: 10 };
      const searchOptions = { minRating: 4.0 };
      const highRatedMovies = mockMovies.filter(m => m.averageRating >= 4.0);
      const repositoryResult = { movies: highRatedMovies, total: 1 };

      mockCacheManager.get.mockResolvedValue(null);
      mockMoviesRepository.findTopRated.mockResolvedValue(repositoryResult);

      const result = await service.getTopRated(undefined, pagination, searchOptions);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].averageRating).toBeGreaterThanOrEqual(4.0);
    });
  });

  describe('getMovieById', () => {
    it('should return movie when found', async () => {
      const movieId = '650e8400-e29b-41d4-a716-446655440001';
      
      mockCacheManager.get.mockResolvedValue(null);
      mockMoviesRepository.findById.mockResolvedValue(mockMovie);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.getMovieById(movieId);

      expect(result).toEqual({
        id: mockMovie.id,
        title: mockMovie.title,
        description: mockMovie.description,
        releaseDate: mockMovie.releaseDate,
        coverImage: mockMovie.coverImage,
        type: mockMovie.type,
        averageRating: mockMovie.averageRating,
        totalRatings: mockMovie.totalRatings,
        cast: mockMovie.cast.map(c => c.actorName),
        createdAt: mockMovie.createdAt,
        updatedAt: mockMovie.updatedAt,
      });

      expect(mockMoviesRepository.findById).toHaveBeenCalledWith(movieId);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `movie:id:${movieId}`,
        result,
        expect.any(Number)
      );
    });

    it('should throw NotFoundException when movie not found', async () => {
      const movieId = '650e8400-e29b-41d4-a716-446655440099';
      
      mockCacheManager.get.mockResolvedValue(null);
      mockMoviesRepository.findById.mockResolvedValue(null);

      await expect(service.getMovieById(movieId)).rejects.toThrow(
        new NotFoundException(`Movie with ID ${movieId} not found`)
      );
    });

    it('should validate movie ID', async () => {
      await expect(service.getMovieById('')).rejects.toThrow(
        new BadRequestException('Movie ID cannot be empty')
      );

      await expect(service.getMovieById('   ')).rejects.toThrow(
        new BadRequestException('Movie ID cannot be empty')
      );
    });

    it('should return cached movie when available', async () => {
      const movieId = '650e8400-e29b-41d4-a716-446655440001';
      const cachedMovie = { 
        id: movieId, 
        title: 'Cached Movie',
        cast: ['Cached Actor'],
        averageRating: 4.0,
      };
      
      mockCacheManager.get.mockResolvedValue(cachedMovie);

      const result = await service.getMovieById(movieId);

      expect(result).toEqual(cachedMovie);
      expect(mockMoviesRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle cast mapping correctly', async () => {
      const movieId = '650e8400-e29b-41d4-a716-446655440001';
      
      mockCacheManager.get.mockResolvedValue(null);
      mockMoviesRepository.findById.mockResolvedValue(mockMovie);

      const result = await service.getMovieById(movieId);

      expect(result.cast).toEqual(['Tom Hanks', 'Brad Pitt']);
      expect(result.cast).toHaveLength(2);
    });
  });

  describe('cache error handling', () => {
    it('should continue operation when cache fails', async () => {
      const pagination = { page: 1, limit: 10 };
      
      mockCacheManager.get.mockRejectedValue(new Error('Cache unavailable'));
      mockMoviesRepository.findTopRated.mockResolvedValue({ movies: [], total: 0 });
      mockCacheManager.set.mockRejectedValue(new Error('Cache set failed'));

      const result = await service.getTopRated(ContentType.MOVIE, pagination);

      expect(result).toBeDefined();
      expect(mockMoviesRepository.findTopRated).toHaveBeenCalled();
    });
  });

  describe('pagination logic', () => {
    it('should calculate pagination correctly for large datasets', async () => {
      const pagination = { page: 1, limit: 2 };
      const repositoryResult = { movies: mockMovies.slice(0, 2), total: 50 };

      mockCacheManager.get.mockResolvedValue(null);
      mockMoviesRepository.findTopRated.mockResolvedValue(repositoryResult);

      const result = await service.getTopRated(ContentType.MOVIE, pagination);

      expect(result.totalPages).toBe(25);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(false);
    });

    it('should handle last page correctly', async () => {
      const pagination = { page: 25, limit: 2 };
      const repositoryResult = { movies: mockMovies.slice(0, 1), total: 50 };

      mockCacheManager.get.mockResolvedValue(null);
      mockMoviesRepository.findTopRated.mockResolvedValue(repositoryResult);

      const result = await service.getTopRated(ContentType.MOVIE, pagination);

      expect(result.totalPages).toBe(25);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(true);
    });

    it('should handle middle page correctly', async () => {
      const pagination = { page: 5, limit: 2 };
      const repositoryResult = { movies: mockMovies.slice(0, 2), total: 50 };

      mockCacheManager.get.mockResolvedValue(null);
      mockMoviesRepository.findTopRated.mockResolvedValue(repositoryResult);

      const result = await service.getTopRated(ContentType.MOVIE, pagination);
      
      expect(result.page).toBe(5);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(true);
    });
  });
});