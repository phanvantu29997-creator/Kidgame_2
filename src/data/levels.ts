import elephantImg from '../assets/images/cartoon_elephant_puzzle_1794646612863.jpg';
import giraffeImg from '../assets/images/cartoon_giraffe_meadow_1794646627052.jpg';
import lionImg from '../assets/images/cartoon_lion_puzzle_1794646614026.jpg';
import pandaImg from '../assets/images/cartoon_panda_puzzle_1794646614717.jpg';
import buffaloImg from '../assets/images/cartoon_buffalo_asian_1794647015935.jpg';
import puppyImg from '../assets/images/cartoon_puppy_asian_1794647015653.jpg';
import kittenImg from '../assets/images/cartoon_kitten_asian_1794647015744.jpg';
import monkeyImg from '../assets/images/cartoon_monkey_asian_1794647016694.jpg';
import ducklingImg from '../assets/images/cartoon_duckling_lotus_1794647016676.jpg';
import bunnyImg from '../assets/images/cartoon_bunny_carrot_1794647017521.jpg';

export interface PuzzleLevel {
  id: number;
  shortTitle: string;
  title: string;
  animalName: string;
  cols: number;
  rows: number;
  pieceCount: number;
  imageUrl: string;
  instruction: string;
  funFact: string;
}

export const PUZZLE_LEVELS: PuzzleLevel[] = [
  {
    id: 1,
    shortTitle: 'Màn 1',
    title: 'Chú Voi Con',
    animalName: 'Chú Voi Con',
    cols: 2,
    rows: 1,
    pieceCount: 2,
    imageUrl: elephantImg,
    instruction: 'Ghép 2 mảnh để tạo thành hình chú voi con đáng yêu nhé!',
    funFact: 'Voi con dùng chiếc vòi dài để uống nước, hái lá và chào các bạn đấy!',
  },
  {
    id: 2,
    shortTitle: 'Màn 2',
    title: 'Chú Hươu Cao Cổ',
    animalName: 'Chú Hươu Cao Cổ',
    cols: 3,
    rows: 1,
    pieceCount: 3,
    imageUrl: giraffeImg,
    instruction: 'Ghép 3 mảnh để ngắm chú hươu cao cổ cười thật tươi nào!',
    funFact: 'Hươu cao cổ có chiếc cổ dài giúp với tới những chiếc lá xanh trên ngọn cây!',
  },
  {
    id: 3,
    shortTitle: 'Màn 3',
    title: 'Chú Sư Tử Nhỏ',
    animalName: 'Chú Sư Tử Nhỏ',
    cols: 2,
    rows: 2,
    pieceCount: 4,
    imageUrl: lionImg,
    instruction: 'Ghép 4 mảnh để hoàn thành bức tranh chú sư tử nhỏ nhé!',
    funFact: 'Chú sư tử nhỏ có chiếc bờm xù màu cam ấm áp và rất thích tắm nắng!',
  },
  {
    id: 4,
    shortTitle: 'Màn 4',
    title: 'Chú Gấu Trúc',
    animalName: 'Chú Gấu Trúc',
    cols: 3,
    rows: 2,
    pieceCount: 6,
    imageUrl: pandaImg,
    instruction: 'Thử thách 6 mảnh ghép bức tranh chú gấu trúc mũm mĩm!',
    funFact: 'Gấu trúc rất hiền lành và mê nhất là gặm những cành trúc non xanh mát!',
  },
  {
    id: 5,
    shortTitle: 'Màn 5',
    title: 'Chú Trâu Con',
    animalName: 'Chú Trâu Con',
    cols: 2,
    rows: 2,
    pieceCount: 4,
    imageUrl: buffaloImg,
    instruction: 'Ghép 4 mảnh để gặp chú trâu con trên cánh đồng lúa xanh nhé!',
    funFact: 'Trâu con là người bạn thân quen của làng quê, thích gặm cỏ non bên bờ ruộng!',
  },
  {
    id: 6,
    shortTitle: 'Màn 6',
    title: 'Chú Chó Vàng',
    animalName: 'Chú Chó Vàng',
    cols: 2,
    rows: 2,
    pieceCount: 4,
    imageUrl: puppyImg,
    instruction: 'Ghép 4 mảnh để tạo thành chú chó vàng đang vẫy đuôi mừng bé!',
    funFact: 'Chú chó vàng rất thông minh, trung thành và thích chạy nhảy trên bãi cỏ!',
  },
  {
    id: 7,
    shortTitle: 'Màn 7',
    title: 'Chú Mèo Mướp',
    animalName: 'Chú Mèo Mướp',
    cols: 2,
    rows: 2,
    pieceCount: 4,
    imageUrl: kittenImg,
    instruction: 'Ghép 4 mảnh để ngắm chú mèo mướp xinh xắn trong vườn hoa nào!',
    funFact: 'Mèo con có đôi mắt tròn xoe, bước đi thật nhẹ nhàng và thích sưởi nắng sớm!',
  },
  {
    id: 8,
    shortTitle: 'Màn 8',
    title: 'Chú Khỉ Con',
    animalName: 'Chú Khỉ Con',
    cols: 3,
    rows: 2,
    pieceCount: 6,
    imageUrl: monkeyImg,
    instruction: 'Ghép 6 mảnh bức tranh chú khỉ con tinh nghịch ăn chuối chín nhé!',
    funFact: 'Khỉ con leo trèo rất giỏi và món khoái khẩu nhất là những quả chuối vàng thơm!',
  },
  {
    id: 9,
    shortTitle: 'Màn 9',
    title: 'Chú Vịt Vàng',
    animalName: 'Chú Vịt Vàng',
    cols: 3,
    rows: 2,
    pieceCount: 6,
    imageUrl: ducklingImg,
    instruction: 'Ghép 6 mảnh để ngắm chú vịt vàng bơi tung tăng trên hồ sen!',
    funFact: 'Vịt con bơi lội rất cừ và kêu "cạp cạp" thật vui tai bên những đóa hoa sen hồng!',
  },
  {
    id: 10,
    shortTitle: 'Màn 10',
    title: 'Chú Thỏ Trắng',
    animalName: 'Chú Thỏ Trắng',
    cols: 3,
    rows: 2,
    pieceCount: 6,
    imageUrl: bunnyImg,
    instruction: 'Màn cuối rồi! Bé ghép 6 mảnh tạo hình chú thỏ trắng ôm cà rốt nhé!',
    funFact: 'Thỏ trắng có đôi tai dài thính nhạy, bộ lông mềm mịn và rất thích ăn cà rốt giòn!',
  },
];
