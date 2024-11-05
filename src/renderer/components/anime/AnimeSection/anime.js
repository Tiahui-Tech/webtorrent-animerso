const React = require('react');
const { useNavigate } = require('react-router-dom');
const { getFormatIcon } = require('../../../../modules/utils');
const { STATUS_LABELS, STATUS_COLORS } = require('../../../../constants/anime');

const {
  Card,
  CardHeader,
  CardBody,
  Image,
  Chip,
  Skeleton
} = require('@nextui-org/react');
const { Icon } = require('@iconify/react');

const AnimeCard = React.memo(({ anime, state, glassStyle }) => {
  const navigate = useNavigate();

  const handleAnimeClick = (anime) => {
    navigate(`/anime/${anime.idAnilist}`, {
      state: { title: anime.title.romaji }
    });
  };

  return (
    <Card
      className="max-w-52 transition duration-300 ease-in-out hover:scale-105 rounded-md border-0 bg-transparent hover:bg-zinc-900"
      style={glassStyle ?? {}}
      isPressable
      onPress={() => handleAnimeClick(anime)}
    >
      <CardBody className="p-0 relative">
        <div className="relative">
          <Image
            src={anime.coverImage.extraLarge}
            alt={anime.title.romaji}
            className="w-full object-cover"
            classNames={{
              img: 'aspect-[9/14] rounded-t-lg'
            }}
          />
          <Skeleton
            className="absolute top-0 left-0 w-full h-full rounded-t-lg"
            isLoaded={!!anime.coverImage.extraLarge}
            style={{
              aspectRatio: '9/14'
            }}
          />
        </div>
        <div className="flex flex-row absolute top-2 right-2 z-10">
          <Chip
            variant="shadow"
            size="sm"
            startContent={<Icon icon="gravity-ui:circle-fill" />}
            color={`${STATUS_COLORS[anime.status]}`}
          >
            {STATUS_LABELS[anime.status]}
          </Chip>
        </div>
      </CardBody>
      <CardHeader className="flex flex-col items-start p-3">
        <p className="text-sm font-medium line-clamp-2 w-full">
          {anime.title.romaji}
        </p>
        <div className="flex justify-between items-center w-full mt-2">
          <div className="flex items-center">
            <Icon icon="gravity-ui:calendar" />
            <span className="text-sm text-gray-400 ml-1">
              {anime.seasonYear || '?'}
            </span>
          </div>
          <div className="flex items-center">
            {getFormatIcon(anime.format)}
            <span className="text-sm text-gray-400 ml-1">{anime.format}</span>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
});

module.exports = AnimeCard;
