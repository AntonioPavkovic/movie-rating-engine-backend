-- CreateEnum
CREATE TYPE "public"."ContentType" AS ENUM ('MOVIE', 'TV_SHOW');

-- CreateTable
CREATE TABLE "public"."movies" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "release_date" TIMESTAMP(3) NOT NULL,
    "cover_image" VARCHAR(500),
    "type" "public"."ContentType" NOT NULL DEFAULT 'MOVIE',
    "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_ratings" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."actors" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "bio" TEXT,
    "image" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_actors" (
    "movie_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "role" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_actors_pkey" PRIMARY KEY ("movie_id","actor_id")
);

-- CreateTable
CREATE TABLE "public"."ratings" (
    "id" UUID NOT NULL,
    "movie_id" UUID NOT NULL,
    "rating" REAL NOT NULL,
    "session_id" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "avatar" VARCHAR(500),
    "provider" VARCHAR(50) NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_statistics" (
    "id" UUID NOT NULL,
    "movie_id" UUID NOT NULL,
    "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_ratings" INTEGER NOT NULL DEFAULT 0,
    "rating_1_count" INTEGER NOT NULL DEFAULT 0,
    "rating_2_count" INTEGER NOT NULL DEFAULT 0,
    "rating_3_count" INTEGER NOT NULL DEFAULT 0,
    "rating_4_count" INTEGER NOT NULL DEFAULT 0,
    "rating_5_count" INTEGER NOT NULL DEFAULT 0,
    "recent_ratings_count" INTEGER NOT NULL DEFAULT 0,
    "trending_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movie_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movies_type_average_rating_idx" ON "public"."movies"("type", "average_rating" DESC);

-- CreateIndex
CREATE INDEX "movies_average_rating_total_ratings_idx" ON "public"."movies"("average_rating" DESC, "total_ratings" DESC);

-- CreateIndex
CREATE INDEX "movies_release_date_idx" ON "public"."movies"("release_date" DESC);

-- CreateIndex
CREATE INDEX "movies_title_idx" ON "public"."movies"("title");

-- CreateIndex
CREATE INDEX "movies_created_at_idx" ON "public"."movies"("created_at" DESC);

-- CreateIndex
CREATE INDEX "actors_name_idx" ON "public"."actors"("name");

-- CreateIndex
CREATE INDEX "ratings_movie_id_rating_idx" ON "public"."ratings"("movie_id", "rating");

-- CreateIndex
CREATE INDEX "ratings_movie_id_created_at_idx" ON "public"."ratings"("movie_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ratings_movie_id_session_id_created_at_idx" ON "public"."ratings"("movie_id", "session_id", "created_at");

-- CreateIndex
CREATE INDEX "ratings_movie_id_ip_address_created_at_idx" ON "public"."ratings"("movie_id", "ip_address", "created_at");

-- CreateIndex
CREATE INDEX "ratings_session_id_created_at_idx" ON "public"."ratings"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "ratings_ip_address_created_at_idx" ON "public"."ratings"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "ratings_rating_idx" ON "public"."ratings"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_movie_id_session_id_key" ON "public"."ratings"("movie_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_movie_id_user_id_key" ON "public"."ratings"("movie_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_provider_idx" ON "public"."users"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_provider_id_key" ON "public"."users"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "movie_statistics_movie_id_key" ON "public"."movie_statistics"("movie_id");

-- CreateIndex
CREATE INDEX "movie_statistics_average_rating_total_ratings_idx" ON "public"."movie_statistics"("average_rating" DESC, "total_ratings" DESC);

-- CreateIndex
CREATE INDEX "movie_statistics_trending_score_idx" ON "public"."movie_statistics"("trending_score" DESC);

-- CreateIndex
CREATE INDEX "movie_statistics_recent_ratings_count_idx" ON "public"."movie_statistics"("recent_ratings_count" DESC);

-- CreateIndex
CREATE INDEX "movie_statistics_last_calculated_at_idx" ON "public"."movie_statistics"("last_calculated_at");

-- AddForeignKey
ALTER TABLE "public"."movie_actors" ADD CONSTRAINT "movie_actors_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_actors" ADD CONSTRAINT "movie_actors_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ratings" ADD CONSTRAINT "ratings_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_statistics" ADD CONSTRAINT "movie_statistics_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
