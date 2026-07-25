# pip install sentence-transformers
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("all-MiniLM-L6-v2")
text="A movie with me"
embedding = model.encode(text)
print(type(embedding))
print(embedding)


sentence1 = "A team of astronauts travel through space."

sentence2 = "People explore the universe."

sentence3 = "A romantic love story."

from sentence_transformers import util
embedding1 = model.encode(sentence1)
embedding2 = model.encode(sentence2)
embedding3 = model.encode(sentence3)
score12 = util.cos_sim(embedding1, embedding2)

score13 = util.cos_sim(embedding1, embedding3)
print(score12)
print(score13)

